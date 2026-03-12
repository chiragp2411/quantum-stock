"""Hybrid SpaCy + Ollama con-call transcript analyzer.

Architecture for speed:
  1. SpaCy + regex extracts ALL structured data instantly (<1 second)
  2. Ollama generates ONLY the detailed markdown summary (one call, ~60 seconds)
  3. If Ollama fails or is unavailable, structured data is still complete
"""

import json
import logging
import re
from collections import Counter
from typing import Any

from app.config import settings
from app.concalls.models import ConCallAnalysis
from app.concalls.spacy_preprocessor import extract_financial_entities

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 4

_POSITIVE_WORDS = frozenset({
    "growth", "grew", "increase", "increased", "strong", "robust", "healthy",
    "improvement", "improved", "record", "expansion", "expanded", "outperformed",
    "exceeded", "beat", "confident", "optimistic", "momentum", "uptick", "surge",
    "milestone", "ramp", "ramping", "scaling", "doubled", "tripled", "profit",
    "profitable", "margin expansion", "market share", "order book",
})

_NEGATIVE_WORDS = frozenset({
    "decline", "declined", "decreased", "decrease", "weak", "weakness", "pressure",
    "challenging", "headwind", "slowdown", "slowed", "contraction", "contracted",
    "loss", "losses", "missed", "shortfall", "delay", "delayed", "concern",
    "risk", "cautious", "volatility", "muted", "subdued", "stressed", "erosion",
    "impairment", "write-off", "restructuring", "inventory loss",
})

_GUIDANCE_KEYWORDS = frozenset({
    "guidance", "target", "outlook", "expect", "expecting", "expected",
    "forecast", "estimate", "plan", "planning", "aiming", "aspire",
    "looking at", "looking to", "we see", "going forward",
})

_SUMMARY_SYSTEM = """You are an expert Indian equity research analyst. Write a comprehensive analysis of this earnings conference call transcript.

Structure your response as a detailed markdown document (600-1000 words) with:
- ## headers for each major business segment or topic discussed
- Specific numbers, volumes, percentages from the transcript
- Direct quotes from management in **bold** or "quotes"
- Segment-wise performance breakdown
- Capacity/expansion plans with timelines
- Forward guidance and outlook
- Key risks and concerns

Write like a professional equity research note. Be specific — include every material number mentioned.
Return ONLY the markdown text, no JSON wrapping."""


def analyze_concall(text: str, quarter_hint: str = "") -> ConCallAnalysis:
    """Analyze a con-call transcript using SpaCy for structured data + Ollama for summary."""
    logger.info("Starting analysis (text_len=%d, quarter_hint=%s)", len(text), quarter_hint)

    structured = _extract_structured(text, quarter_hint)

    summary = ""
    try:
        summary = _generate_summary(text)
        logger.info("Ollama summary generated (%d chars)", len(summary))
    except Exception as exc:
        logger.warning("Ollama summary failed (structured data still complete): %s", exc)

    structured["detailed_summary"] = summary

    model_fields = set(ConCallAnalysis.model_fields.keys())
    fields = {k: v for k, v in structured.items() if k in model_fields}
    analysis = ConCallAnalysis(**fields)

    logger.info("Analysis complete: quarter=%s, tone=%d, highlights=%d, guidance=%d, summary=%d chars",
                analysis.quarter, analysis.tone_score, len(analysis.highlights),
                len(analysis.guidance), len(analysis.detailed_summary))
    return analysis


def _extract_structured(text: str, quarter_hint: str) -> dict:
    """Extract all structured fields using SpaCy + regex. Runs in <1 second."""
    entities = []
    try:
        entities = extract_financial_entities(text)
    except Exception as exc:
        logger.warning("SpaCy extraction failed: %s", exc)

    quarter = _detect_quarter(entities, text, quarter_hint)
    highlights = _extract_highlights(text, entities)
    guidance = _extract_guidance(text, entities)
    tone_score = _score_tone(text)
    green_flags, red_flags = _extract_flags(text)
    execution_score = _score_execution(text)
    key_quotes = _extract_quotes(text)
    lynch_category = _guess_lynch_category(text, tone_score, entities)

    return {
        "quarter": quarter,
        "highlights": highlights,
        "tone_score": tone_score,
        "guidance": guidance,
        "green_flags": green_flags,
        "red_flags": red_flags,
        "management_execution_score": execution_score,
        "key_quotes": key_quotes,
        "lynch_category": lynch_category,
        "confidence": 0.7,
    }


def _detect_quarter(entities: list[dict], text: str, hint: str) -> str:
    """Detect the fiscal quarter from entities and text."""
    if hint:
        return hint

    for ent in entities:
        if ent["label"] == "FY_PERIOD":
            raw = ent["text"].upper().replace(" ", "").replace("-", "")
            m = re.search(r"Q([1-4])FY(\d{2,4})", raw)
            if m:
                fy = m.group(2)
                if len(fy) == 4:
                    fy = fy[2:]
                return f"Q{m.group(1)}FY{fy}"

    m = re.search(r"Q\s*([1-4])\s*(?:FY)?\s*\'?(\d{2,4})", text[:3000], re.IGNORECASE)
    if m:
        fy = m.group(2)
        if len(fy) == 4:
            fy = fy[2:]
        return f"Q{m.group(1)}FY{fy}"

    return "Unknown"


def _extract_highlights(text: str, entities: list[dict]) -> list[str]:
    """Extract key highlights by finding sentences with financial metrics."""
    sentences = _split_sentences(text)
    scored: list[tuple[float, str]] = []

    for sent in sentences:
        if len(sent) < 30 or len(sent) > 400:
            continue
        score = 0.0
        low = sent.lower()

        if re.search(r"\d+(?:\.\d+)?\s*%", sent):
            score += 3
        if re.search(r"(?:₹|Rs\.?|INR)\s*[\d,]+", sent):
            score += 3
        if re.search(r"(?:revenue|ebitda|pat|profit|margin|growth|sales|volume)", low):
            score += 2
        if re.search(r"(?:yoy|y-o-y|year.on.year|quarter.on.quarter|qoq|q-o-q)", low):
            score += 2
        if re.search(r"(?:crore|lakh|million|billion|tons?|tonnes?|megawatt|MW|GW)", low):
            score += 1
        if any(w in low for w in ("guidance", "target", "outlook", "expect")):
            score += 1.5

        if score >= 3:
            scored.append((score, sent.strip()))

    scored.sort(key=lambda x: -x[0])
    seen: set[str] = set()
    highlights: list[str] = []
    for _, sent in scored:
        normalized = re.sub(r"\s+", " ", sent.lower()[:60])
        if normalized not in seen:
            seen.add(normalized)
            highlights.append(sent)
        if len(highlights) >= 12:
            break

    return highlights


def _extract_guidance(text: str, entities: list[dict]) -> dict[str, str]:
    """Extract forward guidance by finding sentences near guidance keywords."""
    sentences = _split_sentences(text)
    guidance: dict[str, str] = {}

    guidance_sents = []
    for sent in sentences:
        low = sent.lower()
        if any(kw in low for kw in _GUIDANCE_KEYWORDS) and re.search(r"\d", sent):
            guidance_sents.append(sent.strip())

    metric_patterns = [
        (r"(?:revenue|sales)\s*(?:growth|target|guidance)", "revenue_growth"),
        (r"(?:ebitda)\s*(?:margin|spread|growth|target)", "ebitda"),
        (r"(?:pat|net profit)\s*(?:growth|margin|target)", "pat_growth"),
        (r"(?:margin)\s*(?:of|at|around|target|guidance)", "margin"),
        (r"(?:capex|capital expenditure)", "capex"),
        (r"(?:volume|capacity|production|tonnage|tons)", "volume"),
        (r"(?:store|branch|outlet)\s*(?:addition|opening|count|expansion)", "store_expansion"),
        (r"(?:order book|order pipeline|orderbook)", "order_book"),
        (r"(?:spread|realization|per ton|per unit)", "spread"),
    ]

    for sent in guidance_sents:
        low = sent.lower()
        for pattern, metric in metric_patterns:
            if re.search(pattern, low) and metric not in guidance:
                value = sent.strip()
                if len(value) > 200:
                    value = value[:200] + "..."
                guidance[metric] = value
                break
        else:
            if len(guidance) < 10:
                numbers = re.findall(r"\d+(?:\.\d+)?(?:\s*%|\s*crore|\s*cr|\s*ton|\s*MW)?", sent)
                if numbers:
                    key = f"guidance_{len(guidance) + 1}"
                    guidance[key] = sent.strip()[:200]

    return dict(list(guidance.items())[:10])


def _score_tone(text: str) -> int:
    """Score management tone 1-10 using keyword frequency analysis."""
    words = text.lower().split()
    pos_count = sum(1 for w in words if w.strip(".,;:!?") in _POSITIVE_WORDS)
    neg_count = sum(1 for w in words if w.strip(".,;:!?") in _NEGATIVE_WORDS)
    total = pos_count + neg_count
    if total == 0:
        return 5

    ratio = pos_count / total
    score = int(round(ratio * 8 + 1))
    return max(1, min(10, score))


def _extract_flags(text: str) -> tuple[list[str], list[str]]:
    """Extract green and red flags from the transcript."""
    sentences = _split_sentences(text)
    green: list[str] = []
    red: list[str] = []

    for sent in sentences:
        if len(sent) < 25 or len(sent) > 300:
            continue
        low = sent.lower()

        pos_score = sum(1 for w in _POSITIVE_WORDS if w in low)
        neg_score = sum(1 for w in _NEGATIVE_WORDS if w in low)

        has_numbers = bool(re.search(r"\d+(?:\.\d+)?(?:\s*%|\s*crore|\s*cr)", sent))

        if pos_score >= 2 and has_numbers and len(green) < 6:
            green.append(sent.strip())
        elif neg_score >= 2 and has_numbers and len(red) < 6:
            red.append(sent.strip())
        elif pos_score >= 2 and neg_score == 0 and len(green) < 6:
            green.append(sent.strip())
        elif neg_score >= 2 and pos_score == 0 and len(red) < 6:
            red.append(sent.strip())

    return green[:6], red[:6]


def _score_execution(text: str) -> int:
    """Score management execution based on past-promise delivery indicators."""
    low = text.lower()
    exec_positive = len(re.findall(r"(?:delivered|achieved|on track|ahead of|exceeded|met our|as guided|as committed)", low))
    exec_negative = len(re.findall(r"(?:delayed|postponed|missed|fell short|below|not met|revised down|behind)", low))

    total = exec_positive + exec_negative
    if total == 0:
        return 5

    ratio = exec_positive / total
    score = int(round(ratio * 8 + 1))
    return max(1, min(10, score))


def _extract_quotes(text: str) -> list[str]:
    """Extract direct management quotes from the transcript."""
    patterns = [
        re.compile(r'"([^"]{30,250})"'),
        re.compile(r'\u201c([^\u201d]{30,250})\u201d'),
    ]
    quotes: list[str] = []
    seen: set[str] = set()

    for pattern in patterns:
        for m in pattern.finditer(text):
            q = m.group(1).strip()
            normalized = q.lower()[:40]
            if normalized not in seen and len(q) > 30:
                seen.add(normalized)
                quotes.append(q)
            if len(quotes) >= 8:
                break

    if len(quotes) < 3:
        sentences = _split_sentences(text)
        for sent in sentences:
            low = sent.lower()
            if any(w in low for w in ("we are", "we will", "we expect", "we have", "our focus", "our plan")):
                if re.search(r"\d", sent) and len(sent) > 40 and len(sent) < 250:
                    normalized = sent.lower()[:40]
                    if normalized not in seen:
                        seen.add(normalized)
                        quotes.append(sent.strip())
                if len(quotes) >= 8:
                    break

    return quotes[:8]


def _guess_lynch_category(text: str, tone: int, entities: list[dict]) -> str:
    """Guess Peter Lynch classification from transcript signals."""
    low = text.lower()

    growth_mentions = len(re.findall(r"(?:growth|grew|increase)\s+(?:of\s+)?\d+\s*%", low))
    has_high_growth = bool(re.search(r"(?:growth|grew|increase)\s+(?:of\s+)?(?:[3-9]\d|[1-9]\d{2})\s*%", low))
    has_turnaround = bool(re.search(r"(?:turnaround|restructuring|recovery|loss to profit|breakeven)", low))
    has_cyclical = bool(re.search(r"(?:cycle|cyclical|commodity|steel|metal|oil|mining|seasonal)", low))
    has_dividend = bool(re.search(r"(?:dividend|yield|payout)\s*(?:of|at|around)?\s*\d", low))

    if has_turnaround:
        return "Turnaround"
    if has_cyclical:
        return "Cyclical"
    if has_high_growth and growth_mentions >= 3:
        return "Fast Grower"
    if has_dividend and tone >= 6:
        return "Stalwart"
    if growth_mentions >= 2:
        return "Fast Grower"
    if tone >= 6:
        return "Stalwart"
    return "Slow Grower"


def _generate_summary(text: str) -> str:
    """Generate detailed markdown summary using Ollama. Single call, ~60 seconds."""
    import ollama as ollama_client

    try:
        models = ollama_client.list()
        model_names = [m.model for m in models.models] if models.models else []
        target = settings.ollama_model
        if not any(_model_matches(target, n) for n in model_names):
            raise ConnectionError(f"Model '{target}' not found. Available: {model_names[:5]}")
    except Exception as exc:
        raise ConnectionError(f"Ollama not available: {exc}") from exc

    excerpt = text[:8000]

    logger.info("Calling Ollama for summary (model=%s, text=%d chars)...", settings.ollama_model, len(excerpt))
    response = ollama_client.chat(
        model=settings.ollama_model,
        messages=[
            {"role": "system", "content": _SUMMARY_SYSTEM},
            {"role": "user", "content": excerpt},
        ],
        options={"temperature": 0.3, "num_predict": 4096},
    )

    summary = response.message.content.strip()
    if summary.startswith("```"):
        summary = re.sub(r"^```\w*\n?", "", summary)
        summary = re.sub(r"\n?```$", "", summary)

    return summary


def _model_matches(target: str, available: str) -> bool:
    return target.split(":")[0].lower() == available.split(":")[0].lower()


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences, handling common abbreviations."""
    text = re.sub(r"\n{2,}", ". ", text)
    text = re.sub(r"\n", " ", text)
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z\u201c"])', text)
    return [s.strip() for s in parts if len(s.strip()) > 15]


def guess_quarter(filename: str) -> str:
    """Extract quarter info from filename patterns."""
    name = filename.upper().replace("_", " ").replace("-", " ")

    m = re.search(r"Q\s*([1-4])\s*FY\s*(\d{2,4})", name)
    if m:
        fy = m.group(2)
        return f"Q{m.group(1)}FY{fy[2:] if len(fy) == 4 else fy}"

    m = re.search(r"FY\s*(\d{2,4})\s*Q\s*([1-4])", name)
    if m:
        fy = m.group(1)
        return f"Q{m.group(2)}FY{fy[2:] if len(fy) == 4 else fy}"

    month_map = {
        "JAN": ("Q3", 0), "FEB": ("Q3", 0), "MAR": ("Q3", 0),
        "APR": ("Q4", 0), "MAY": ("Q4", 0), "JUN": ("Q4", 0),
        "JUL": ("Q1", 1), "AUG": ("Q1", 1), "SEP": ("Q1", 1),
        "OCT": ("Q2", 1), "NOV": ("Q2", 1), "DEC": ("Q2", 1),
    }
    month_pattern = "|".join(month_map.keys())
    m = re.search(rf"({month_pattern})\w*\s*(\d{{4}})", name)
    if m:
        month = m.group(1)[:3]
        year = int(m.group(2))
        quarter, fy_offset = month_map[month]
        return f"{quarter}FY{(year + fy_offset) % 100:02d}"

    return ""
