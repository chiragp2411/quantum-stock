"""QuantumStock FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import ensure_indexes, get_client
from app.auth.router import router as auth_router
from app.stocks.router import router as stocks_router
from app.concalls.router import router as concalls_router
from app.valuation.router import router as valuation_router
from app.news.router import router as news_router
from app.notes.router import router as notes_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_ollama_ok = False
_spacy_ok = False
_gemini_ok = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ollama_ok, _spacy_ok, _gemini_ok

    ensure_indexes()
    _reset_stuck_analyses()

    provider = settings.analysis_provider.lower()
    if provider == "gemini":
        _gemini_ok = _check_gemini()
    _ollama_ok = _check_ollama()
    _spacy_ok = _check_spacy()

    logger.info(
        "QuantumStock backend started (analysis_provider=%s, gemini=%s, ollama=%s)",
        settings.analysis_provider, _gemini_ok, _ollama_ok,
    )
    yield
    client = get_client()
    client.close()
    logger.info("QuantumStock backend shutdown")


def _reset_stuck_analyses():
    """Reset any concalls stuck in 'analyzing' or 'queued' from previous runs."""
    from app.database import concalls_col
    col = concalls_col()
    result = col.update_many(
        {"status": {"$in": ["analyzing", "queued"]}},
        {"$set": {"status": "pending"}},
    )
    if result.modified_count > 0:
        logger.info("Reset %d stuck concalls to pending", result.modified_count)


def _check_ollama() -> bool:
    """Verify Ollama connectivity and model availability at startup."""
    try:
        import ollama
        models_resp = ollama.list()
        model_names = [m.model for m in models_resp.models] if models_resp.models else []
        logger.info("Ollama connected. Available models: %s", model_names[:5])

        target = settings.ollama_model
        target_base = target.split(":")[0].lower()
        found = any(target_base == m.split(":")[0].lower() for m in model_names)
        if not found:
            logger.warning(
                "Configured model '%s' not found in Ollama. "
                "Run: ollama pull %s",
                target,
                target,
            )
        else:
            logger.info("Ollama model '%s' ready", target)
        return True
    except Exception as exc:
        logger.warning(
            "Ollama not reachable at %s — con-call analysis will fail. "
            "Start Ollama and pull the model: ollama pull %s. Error: %s",
            settings.ollama_base_url,
            settings.ollama_model,
            exc,
        )
        return False


def _check_spacy() -> bool:
    """Verify SpaCy model is installed at startup."""
    try:
        import spacy
        spacy.load(settings.spacy_model, disable=["lemmatizer"])
        logger.info("SpaCy model '%s' loaded successfully", settings.spacy_model)
        return True
    except OSError:
        logger.warning(
            "SpaCy model '%s' not found. "
            "Run: python -m spacy download %s",
            settings.spacy_model,
            settings.spacy_model,
        )
        return False
    except Exception as exc:
        logger.warning("SpaCy check failed: %s", exc)
        return False


def _check_gemini() -> bool:
    """Verify Gemini API key and model availability at startup."""
    if not settings.gemini_api_key:
        logger.warning(
            "GEMINI_API_KEY not set. Set ANALYSIS_PROVIDER=gemini and "
            "GEMINI_API_KEY in .env to use Gemini."
        )
        return False
    try:
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)
        models = client.models.list()
        model_names = [m.name for m in models]
        target = settings.gemini_model
        found = any(target in name for name in model_names)
        if found:
            logger.info("Gemini model '%s' available", target)
        else:
            logger.warning(
                "Gemini model '%s' not found in available models. "
                "Check GEMINI_MODEL in .env.",
                target,
            )
        return True
    except Exception as exc:
        logger.warning("Gemini API check failed: %s", exc)
        return False


app = FastAPI(
    title="QuantumStock API",
    description="Personal equity research tool for Indian markets",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(stocks_router)
app.include_router(concalls_router)
app.include_router(valuation_router)
app.include_router(news_router)
app.include_router(notes_router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": "QuantumStock",
        "analysis_provider": settings.analysis_provider,
        "gemini_connected": _gemini_ok,
        "gemini_model": settings.gemini_model if _gemini_ok else None,
        "ollama_connected": _ollama_ok,
        "ollama_model": settings.ollama_model,
        "spacy_loaded": _spacy_ok,
        "spacy_model": settings.spacy_model,
    }
