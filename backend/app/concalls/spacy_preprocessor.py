"""SpaCy-based financial entity extraction for con-call transcripts.

Runs NER plus custom pattern matching to identify financial metrics,
percentages, currency amounts, guidance phrases, and fiscal periods.
The extracted entities are fed to the Ollama LLM to boost extraction accuracy.
"""

import logging
import re
from typing import Optional

import spacy
from spacy.language import Language
from spacy.matcher import Matcher

from app.config import settings

logger = logging.getLogger(__name__)

_nlp: Optional[Language] = None


def _get_nlp() -> Language:
    """Lazy-load the SpaCy model with custom financial patterns."""
    global _nlp
    if _nlp is not None:
        return _nlp

    try:
        nlp = spacy.load(settings.spacy_model, disable=["lemmatizer"])
    except OSError:
        logger.error(
            "SpaCy model '%s' not found. "
            "Run: python -m spacy download %s",
            settings.spacy_model,
            settings.spacy_model,
        )
        raise

    ruler = nlp.add_pipe("entity_ruler", before="ner")
    ruler.add_patterns(_ENTITY_PATTERNS)

    _nlp = nlp
    logger.info("SpaCy model '%s' loaded with financial EntityRuler", settings.spacy_model)
    return _nlp


_ENTITY_PATTERNS = [
    {"label": "FY_PERIOD", "pattern": [{"TEXT": {"REGEX": r"(?i)FY\d{2,4}"}}]},
    {"label": "FY_PERIOD", "pattern": [{"TEXT": {"REGEX": r"(?i)Q[1-4]"}}, {"TEXT": {"REGEX": r"(?i)FY\d{2,4}"}}]},
    {"label": "FY_PERIOD", "pattern": [{"TEXT": {"REGEX": r"(?i)H[12]"}}, {"TEXT": {"REGEX": r"(?i)FY\d{2,4}"}}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "guidance"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "target"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "outlook"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "expect"}, {"LOWER": {"IN": ["to", "a", "the", "that"]}, "OP": "?"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "expecting"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "growth"}, {"LOWER": "of"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "capex"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "capital"}, {"LOWER": "expenditure"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "margin"}, {"LOWER": {"IN": ["of", "at", "around", "between"]}, "OP": "?"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "revenue"}, {"LOWER": {"IN": ["of", "at", "around", "growth"]}, "OP": "?"}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "same"}, {"LOWER": "store"}, {"LOWER": {"IN": ["sales", "growth"]}}]},
    {"label": "GUIDANCE", "pattern": [{"LOWER": "store"}, {"LOWER": {"IN": ["additions", "openings", "count"]}}]},
]

_PERCENT_RE = re.compile(r"\d+(?:\.\d+)?\s*%")
_CURRENCY_RE = re.compile(
    r"(?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d+)?\s*(?:crore|cr|lakh|lk|million|mn|billion|bn)?",
    re.IGNORECASE,
)
_GROWTH_RE = re.compile(
    r"(?:growth|increase|decline|decrease|grew|fell|dropped|rose|up|down)\s+(?:of\s+)?(?:about\s+)?\d+",
    re.IGNORECASE,
)


def extract_financial_entities(text: str) -> list[dict]:
    """Extract financial entities from transcript text.

    Returns a list of dicts with keys: text, label, sentence, context.
    The context field includes ~30 words around the entity for LLM grounding.
    """
    nlp = _get_nlp()

    if len(text) > 500_000:
        text = text[:500_000]

    doc = nlp(text)

    entities: list[dict] = []
    seen: set[str] = set()

    for ent in doc.ents:
        if ent.label_ in ("FY_PERIOD", "GUIDANCE", "PERCENT", "MONEY", "DATE", "ORG", "CARDINAL"):
            key = f"{ent.label_}:{ent.text.strip()[:80]}:{ent.start}"
            if key in seen:
                continue
            seen.add(key)
            entities.append(_ent_to_dict(ent, doc))

    for match in _PERCENT_RE.finditer(text):
        key = f"PERCENT_RE:{match.group()}:{match.start()}"
        if key not in seen:
            seen.add(key)
            entities.append(_regex_to_dict(match, text, "PERCENT"))

    for match in _CURRENCY_RE.finditer(text):
        key = f"CURRENCY_RE:{match.group()[:60]}:{match.start()}"
        if key not in seen:
            seen.add(key)
            entities.append(_regex_to_dict(match, text, "CURRENCY"))

    for match in _GROWTH_RE.finditer(text):
        key = f"GROWTH_RE:{match.group()[:60]}:{match.start()}"
        if key not in seen:
            seen.add(key)
            entities.append(_regex_to_dict(match, text, "GROWTH"))

    entities.sort(key=lambda e: e.get("_pos", 0))
    for e in entities:
        e.pop("_pos", None)

    logger.info(
        "SpaCy extracted %d financial entities (%d unique labels)",
        len(entities),
        len({e["label"] for e in entities}),
    )
    return entities


def summarize_entities(entities: list[dict], max_items: int = 80) -> str:
    """Format entities into a concise text block for the LLM prompt."""
    if not entities:
        return "(No structured entities detected by pre-processing.)"

    by_label: dict[str, list[str]] = {}
    for e in entities[:max_items]:
        label = e["label"]
        ctx = e.get("context", e["text"])
        by_label.setdefault(label, []).append(ctx)

    lines: list[str] = []
    for label, items in by_label.items():
        unique = list(dict.fromkeys(items))[:15]
        lines.append(f"[{label}]")
        for item in unique:
            lines.append(f"  - {item}")
    return "\n".join(lines)


def _ent_to_dict(ent, doc) -> dict:
    """Convert a SpaCy entity span to our dict format."""
    sent = ent.sent.text.strip() if ent.sent else ""
    start_tok = max(0, ent.start - 15)
    end_tok = min(len(doc), ent.end + 15)
    context = doc[start_tok:end_tok].text.strip()
    return {
        "text": ent.text.strip(),
        "label": ent.label_,
        "sentence": sent[:300],
        "context": context[:400],
        "_pos": ent.start_char,
    }


def _regex_to_dict(match: re.Match, full_text: str, label: str) -> dict:
    """Convert a regex match to our dict format."""
    start = match.start()
    end = match.end()
    ctx_start = max(0, start - 120)
    ctx_end = min(len(full_text), end + 120)
    context = full_text[ctx_start:ctx_end].strip()

    sent_start = full_text.rfind(".", 0, start)
    sent_start = sent_start + 1 if sent_start >= 0 else max(0, start - 200)
    sent_end = full_text.find(".", end)
    sent_end = sent_end + 1 if sent_end >= 0 else min(len(full_text), end + 200)
    sentence = full_text[sent_start:sent_end].strip()

    return {
        "text": match.group().strip(),
        "label": label,
        "sentence": sentence[:300],
        "context": context[:400],
        "_pos": start,
    }
