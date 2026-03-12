# QuantumStock Backend — AI Context

Quick reference for AI assistants and new developers working on the QuantumStock backend.

## Project Overview

QuantumStock is a **local-first equity research tool** for Indian markets (NSE/BSE), inspired by Peter Lynch's "One Up on Wall Street". It allows users to upload earnings conference call transcripts, analyze them with local AI (Ollama + SpaCy), track management guidance over quarters, and run forward valuation scenarios using Lynch's 4-phase framework.

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Web Framework | FastAPI 0.135 | Async HTTP API with auto-docs at `/docs` |
| ASGI Server | Uvicorn 0.41 | Development and production server |
| Database | MongoDB (pymongo 4.16) | Document store for all app data |
| PDF Storage | GridFS (pymongo) | Binary storage for uploaded PDFs |
| LLM | Ollama (Mistral 7B) | Local con-call transcript analysis |
| NLP Pre-processing | SpaCy 3.8 (en_core_web_sm) | Financial entity extraction for LLM |
| Market Data | yfinance 1.2 | Stock price, PE, EPS, market cap |
| PDF Parsing | pdfplumber 0.11 | Text extraction from PDF transcripts |
| Auth: Hashing | bcrypt 5.0 | Password hashing (12 salt rounds) |
| Auth: Tokens | PyJWT 2.11 | JWT creation/validation (HS256, 24h) |
| Caching | Custom dict with TTL | In-memory cache for yfinance (15 min) |
| Config | pydantic-settings 2.13 | Type-safe env var loading from `.env` |
| Package Manager | uv | Fast Python dependency management |

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py              # Pydantic settings (env vars)
│   ├── database.py            # MongoDB client, collections, GridFS
│   ├── main.py                # FastAPI app, lifespan, middleware
│   ├── auth/
│   │   ├── models.py          # UserCreate, UserLogin, TokenResponse
│   │   ├── router.py          # POST /api/auth/signup, /login
│   │   └── utils.py           # hash_password, verify_password, JWT, get_current_user
│   ├── stocks/
│   │   ├── models.py          # StockInfo, LynchCategory, classify_lynch()
│   │   ├── router.py          # GET /api/stocks/search, /recent, /{symbol}/summary
│   │   ├── yfinance_service.py # yfinance wrapper with TTL cache
│   │   └── scraper_stub.py    # Placeholder for BSE/NSE scraping
│   ├── concalls/
│   │   ├── models.py          # ConCallAnalysis, GuidanceRow, ManualOverride
│   │   ├── router.py          # POST upload/analyze/reanalyze, GET list/tracker
│   │   ├── llm_analyzer.py    # Ollama two-pass analysis pipeline
│   │   ├── spacy_preprocessor.py # SpaCy NER for financial entities
│   │   └── pdf_parser.py      # pdfplumber text extraction + chunking
│   ├── valuation/
│   │   ├── models.py          # Phase enum, ScenarioInput/Result, ValuationResult
│   │   ├── router.py          # POST calculate, GET latest
│   │   └── calculator.py      # Lynch 4-phase matrix, scenario math
│   └── news/
│       ├── router.py          # GET /api/news/{symbol}
│       └── service.py         # Mock news data (stub)
├── docs/                      # This documentation
├── seed.py                    # Create default admin user
├── pyproject.toml             # uv project config + dependencies
└── .env                       # Environment variables (not in git)
```

## Key Patterns

- **Router pattern**: Each feature module has its own `router.py` with an `APIRouter` that gets included in `main.py`.
- **Auth dependency**: All protected endpoints use `_user: dict = Depends(get_current_user)` which extracts and validates the JWT from the `Authorization: Bearer <token>` header.
- **MongoDB access**: Collection accessors are functions in `database.py` (e.g., `stocks_col()`, `concalls_col()`). No ORM — raw pymongo queries.
- **Error handling**: `HTTPException` with `status_code=` and `detail=` keyword args. Generic "Invalid username or password" messages to prevent enumeration.
- **Config**: All env vars are loaded via `pydantic-settings` in `config.py`. The `.env` file path is resolved absolutely from `config.py`'s location.

## Environment Variables

```bash
MONGO_URI=mongodb://localhost:27017     # MongoDB connection string
DB_NAME=quantumstock                     # Database name
OLLAMA_MODEL=mistral:7b-instruct-v0.3-q5_K_M  # Ollama model for analysis
OLLAMA_BASE_URL=http://localhost:11434   # Ollama server URL
SPACY_MODEL=en_core_web_sm              # SpaCy NLP model
JWT_SECRET=your-secret                   # Auto-generated if not set (changes on restart!)
JWT_ALGORITHM=HS256                      # JWT signing algorithm
JWT_EXPIRE_HOURS=24                      # Token lifetime
ADMIN_PASS=your-admin-password          # Used by seed.py
CORS_ORIGINS=http://localhost:3000      # Comma-separated allowed origins
```

## Common Tasks

### Start the backend
```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

### Seed the admin user
```bash
cd backend
uv run python seed.py
```

### Check API health
```bash
curl http://localhost:8000/api/health
```

### View auto-generated API docs
Open `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc`.

## Gotchas

1. **Ollama must be running** with the configured model pulled before starting the backend. Run: `ollama pull mistral:7b-instruct-v0.3-q5_K_M`
2. **JWT_SECRET regenerates** on every restart if not set in `.env`. Set it for persistent sessions.
3. **yfinance cache is in-memory** — it resets on server restart. TTL is 15 minutes.
4. **MongoDB must be running** on `localhost:27017` (default) before starting the backend.
5. **Stock symbols** require `.NS` (NSE) or `.BO` (BSE) suffix. The API auto-appends `.NS` if no suffix is provided.
6. **PDF text extraction** can fail for scanned PDFs (images). pdfplumber works best with text-based PDFs.
7. **SpaCy model must be downloaded** before first run. Run: `uv run python -m spacy download en_core_web_sm`
8. **Ollama analysis is slow** — each con-call takes 1-3 minutes on CPU. The analysis endpoint blocks until all concalls are processed.

## MongoDB Collections

| Collection | Index | Purpose |
|-----------|-------|---------|
| `users` | `username` (unique) | User accounts |
| `stocks` | `symbol` (unique) | Cached stock data from yfinance |
| `concalls` | `(stock_symbol, quarter)` | Con-call transcripts + LLM analysis |
| `financials` | `(stock_symbol, period)` | Actual financial data (manual overrides) |
| `valuations` | `(stock_symbol, created_at desc)` | Saved valuation scenarios |
| `fs.files` + `fs.chunks` | GridFS default | Uploaded PDF binary storage |
