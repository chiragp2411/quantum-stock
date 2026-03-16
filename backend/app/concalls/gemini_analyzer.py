"""Gemini-powered con-call transcript analyzer with structured output.

Replaces SpaCy + Ollama with a single Gemini call that returns
all analysis fields as structured JSON matching the ConCallAnalysis schema.
"""

import json
import logging
import re
from typing import Optional

from google import genai
from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.concalls.models import ConCallAnalysis, GuidanceItem

logger = logging.getLogger(__name__)

_MAX_RETRIES = 2

# ---------------------------------------------------------------------------
# System prompt — the master instruction set for Gemini
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are an expert Indian equity research analyst producing institutional-grade
conference call analysis for NSE/BSE-listed companies. Your output should match the quality and
depth of professional equity research platforms.

Analyze this earnings call transcript comprehensively. Extract structured intelligence and produce
a detailed research note.

=== DETAILED_SUMMARY FORMAT (CRITICAL — follow exactly) ===

The detailed_summary field MUST be a comprehensive, well-structured markdown document (1500-3000 words)
following this exact format. This is the MOST IMPORTANT field.

Structure it as a professional concall summary with these rules:

1. **Title**: Start with "Concall Summary - {Month} {Year}" based on the quarter
2. **Topic-based H2 sections**: Break the analysis into TOPICS discussed in the call, NOT generic categories.
   Each section header should describe the actual business topic (e.g., "Store expansion: clustering + new state entries"
   NOT "Growth Strategy"). Use descriptive headers that tell the reader what the section is about.
3. **H3 sub-sections** for sub-topics within each major topic.
4. **Bullet points with exact quotes**: Use management's exact words in **bold** or "quotes".
   Every claim MUST have the specific number or quote from the transcript.
5. **Sub-bullets for details**: Nest bullet points for breakdowns (capacity, timelines, segment splits).
6. **Numbers everywhere**: Revenue, margins, volumes, growth rates, per-unit economics, capacity utilization.
   NEVER make a claim without the supporting number from the transcript.
7. **Direct attribution**: When management says something forward-looking, frame it as
   "management expects/guided/stated/asserted/claimed" — not as fact.
8. **Quarter performance first**: Start with headline numbers (Revenue, EBITDA, PAT, margins, key growth metrics)
   with YoY/QoQ comparisons.
9. **Business segment breakdown**: If the company has multiple segments/products/geographies,
   break down performance and outlook for EACH ONE separately with its own sub-section.
10. **Capex/expansion section**: Dedicated section for capacity additions, new launches, geographic expansion
    with specific timelines and amounts.
11. **Management guidance section**: What they guided for next quarter/year with specific numbers.
12. **Key investor takeaways**: End with a "Key investor takeaways" or "Newsworthy / actionable takeaways"
    section summarizing the 4-6 most important points an investor should act on.

WHAT MAKES A GREAT SUMMARY:
- Reads like a professional equity research note, not a generic AI summary
- Every bullet has a specific number, quote, or data point from the transcript
- Captures NUANCE: management's framing, tone shifts, what they emphasized vs deflected
- Separates "reported" numbers from "management's adjusted" numbers when they differ
- Identifies what's NEW this quarter vs maintained from prior guidance
- Notes any contradictions or notable Q&A exchanges

=== STRUCTURED GUIDANCE EXTRACTION (CRITICAL — this is the most important analytical output) ===

The structured_guidance field must capture EVERY forward-looking statement management makes.
This is the core of the investment decision system. Follow these rules precisely:

STANDARDIZED METRIC KEYS (always use these exact strings):
  revenue_growth, pat_growth, ebitda_growth, volume_growth, earnings_cagr, sssg,
  revenue, ebitda, pat, ebitda_margin, pat_margin, gross_margin, roce, roe,
  capex, store_count, volume, capacity, capacity_utilization, order_book,
  market_share, working_capital_days, geographic_expansion, employee_count

If a guidance item does not fit any key above, use a descriptive snake_case key.
For segment-specific guidance, use the SAME metric key but fill the "segment" field.

VAGUE LANGUAGE → NUMERIC MAPPING (you MUST convert these):
  "high teens"          → value_low=15, value_high=19, unit=pct
  "mid-teens"           → value_low=14, value_high=16, unit=pct
  "low teens"           → value_low=11, value_high=13, unit=pct
  "low double digits"   → value_low=10, value_high=13, unit=pct
  "strong double-digit" → value_low=15, value_high=25, unit=pct
  "mid-to-high teens"   → value_low=14, value_high=19, unit=pct
  "low-20s"             → value_low=20, value_high=23, unit=pct
  "upper single digits" → value_low=7, value_high=9, unit=pct
  "high single digits"  → value_low=7, value_high=9, unit=pct
  "mid single digits"   → value_low=4, value_high=6, unit=pct
  "double revenue in 3 years" → metric=revenue_growth, value_low=26, value_high=26, unit=pct (CAGR)
  "triple in 5 years"   → value_low=24, value_high=25, unit=pct (CAGR)
  For any other vague expression, estimate a reasonable numeric range and set guidance_type="vague_range".

ALL 15 GUIDANCE CASES — you must handle each correctly:

Case 1 — EXPLICIT NUMERIC: "We expect 20-25% sales growth in FY26."
  → guidance_type="explicit_numeric", value_low=20, value_high=25, unit=pct

Case 2 — NO NEW GUIDANCE (continuation): "We remain on track with our earlier guidance" or management gives no numbers.
  → guidance_type="continued", revision="maintained"
  → Copy the PREVIOUS quarter's guidance values into value_low/value_high.
  → evidence_quote must capture the "on track" or similar statement.

Case 3 — RAISED OR LOWERED: "We are now targeting 30% instead of 25%."
  → guidance_type="explicit_numeric", revision="raised" or "lowered"
  → revision_detail="Raised from 25% to 30%"

Case 4 — VAGUE RANGE: "high teens", "mid-teens", "low double digits"
  → guidance_type="vague_range", map to numeric range using table above.

Case 5 — QUALITATIVE ONLY: "robust demand", "strong growth expected"
  → guidance_type="qualitative", value_low=null, value_high=null
  → value_text captures the exact language.

Case 6 — CONDITIONAL: "15-20% if monsoon is normal"
  → guidance_type="conditional", conditions="if monsoon is normal"
  → Still fill value_low/value_high with the numbers.

Case 7 — IMPLICIT CONFIRMATION: Analyst asks "Is 25% reasonable?" Management: "Yes, comfortable."
  → guidance_type="implicit_confirmation"
  → evidence_quote must capture BOTH the question and answer.

Case 8 — SEGMENT-WISE: "Retail 25%, Manufacturing 15%"
  → Create SEPARATE GuidanceItem entries for each segment.
  → Same metric key, different segment field.

Case 9 — HISTORICAL CONTINUATION: "committed to our long-term 25% CAGR target"
  → guidance_type="continued", period="long_term"

Case 10 — LANGUAGE SHIFT without numbers: Tone more cautious/confident but no number change.
  → If previous guidance exists, guidance_type="continued", revision="maintained"
  → Note the shift in revision_detail, e.g. "Tone more cautious but numbers unchanged"

Case 11 — WITHDRAWAL: "not giving guidance due to uncertainty"
  → guidance_type="withdrawn", revision="withdrawn"
  → value_low=null, value_high=null

Case 12 — CONTRADICTION with previous call: "Said on track last quarter, now says delayed."
  → Flag in the contradictions list AND in revision_detail.
  → revision="lowered" if the contradiction implies downward revision.

Case 13 — TIME-BOUND without %: "aim to double revenue in 3 years"
  → Convert to CAGR: doubling in 3 years ≈ 26% CAGR.
  → guidance_type="explicit_numeric", period="long_term"

Case 14 — CHANGE IN FOCUS: Last quarter revenue guidance, this quarter margin/capex focus.
  → Create items for the NEW metrics being guided.
  → If old metrics are NOT mentioned, do NOT create continued items — only create items for what was actually discussed.

Case 15 — COMBINATION: Multiple cases in one call.
  → Create separate GuidanceItem entries for each, each with its own type/revision.

REVISION DETERMINATION:
- If previous quarter guidance is provided in context, compare values.
  If current value > previous value → revision="raised"
  If current value < previous value → revision="lowered"
  If approximately same → revision="maintained"
  If no previous guidance for this metric → revision="new"
  If guidance withdrawn → revision="withdrawn"
- If NO previous guidance context is available, set revision="new" for all items.

EVIDENCE QUOTES:
- EVERY GuidanceItem MUST have an evidence_quote with the exact text from the transcript.
- For implicit confirmations, include the analyst question AND management response.
- Keep quotes concise (1-3 sentences) but complete enough to verify the guidance.

=== OTHER FIELD EXTRACTION RULES ===

1. All monetary amounts in ₹ crore (cr). All percentages as whole numbers.
2. Every highlight MUST contain specific numbers from the transcript — no generic statements.
3. The legacy "guidance" dict: still fill it with the top 5-8 most important guidance items as simple
   key-value strings for backward compatibility. Use descriptive keys.
4. Tone score meaning:
   - 8-10: Management is specific, confident, gives numbers freely, addresses tough questions openly
   - 5-7: Mixed signals, some hedging but generally positive
   - 1-4: Evasive, vague, avoids specifics, defensive on misses, hedging language
5. Green/red flags must be SPECIFIC business signals with supporting evidence:
   Green: margin expansion with %, order book growth with ₹, capex on track with timeline
   Red: debt rising with ratio, customer concentration %, guidance cuts with numbers
6. Business model: describe in 2-3 sentences what the company does, who pays them, and how they earn
7. Moat signals: specific EVIDENCE from the call — not generic claims.
   e.g., "92% sales at full price" or "empaneled with 25 OEMs" — not just "strong brand"
8. Investment thesis: exactly 3 bullets in plain English:
   Bullet 1: Why buy/increase (the growth case with specific drivers)
   Bullet 2: Key risks (specific risks mentioned in the call, not generic)
   Bullet 3: Switch trigger — specific event that means EXIT (e.g., "two consecutive guidance cuts
   or EBITDA margin falls below 15%")
9. Lynch category: classify based on actual growth numbers and trajectory
10. Financial numbers: extract exact quarterly numbers if mentioned (revenue, EBITDA, PAT, margins, growth rates)
11. Capex plans: extract specific amounts (₹ cr), timelines, capacity additions, and locations
12. Guidance trajectory: assess whether guidance is being raised, maintained, or cut vs previous quarter"""


# ---------------------------------------------------------------------------
# Gemini structured output schema
# ---------------------------------------------------------------------------

class _GeminiGuidanceItem(BaseModel):
    """Structured guidance item for Gemini to fill."""
    metric: str = Field(description="Standardized metric key from taxonomy")
    metric_label: str = Field(description="Human-readable: 'Revenue Growth', 'PAT', 'EBITDA Margin'")
    period: str = Field(description="FY27, Q4FY26, FY28, long_term")
    value_text: str = Field(description="Raw management text: '₹350 cr+', '25-30%', 'high teens'")
    value_low: Optional[float] = Field(default=None, description="Numeric lower bound")
    value_high: Optional[float] = Field(default=None, description="Numeric upper bound")
    unit: str = Field(default="pct", description="pct, cr, tons, stores, days, x, units")
    guidance_type: str = Field(
        description="explicit_numeric | vague_range | qualitative | conditional | "
        "continued | implicit_confirmation | withdrawn"
    )
    revision: str = Field(
        default="new",
        description="new | raised | maintained | lowered | withdrawn | unknown"
    )
    revision_detail: Optional[str] = Field(default=None, description="E.g. 'Raised from 25% to 30%'")
    evidence_quote: str = Field(default="", description="Exact management quote supporting this")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    conditions: Optional[str] = Field(default=None, description="Conditional clause if any")
    segment: Optional[str] = Field(default=None, description="Business segment if applicable")


class _GeminiAnalysisSchema(BaseModel):
    """Schema sent to Gemini for structured output. Mirrors ConCallAnalysis fields."""

    quarter: str = Field(description="Fiscal quarter e.g. Q3FY26")
    detailed_summary: str = Field(
        description="1500-3000 word professional concall summary in markdown. Topic-based H2/H3 sections, "
        "bullet points with exact quotes in bold, specific numbers, segment breakdowns, "
        "management guidance, and key investor takeaways. See format rules in system prompt."
    )
    highlights: list[str] = Field(description="8-12 quantitative takeaways, each with specific numbers from the transcript")
    tone_score: int = Field(ge=1, le=10, description="1-10 management confidence and transparency score")
    guidance: dict[str, str] = Field(
        description="Legacy flat guidance dict with top 5-8 items: {'revenue_growth': '25-28%', 'capex': '₹200 cr FY27'}"
    )
    structured_guidance: list[_GeminiGuidanceItem] = Field(
        description="Complete structured guidance: every forward-looking item with standardized metrics, "
        "numeric ranges, revision status (new/raised/maintained/lowered/withdrawn), evidence quotes, "
        "and conditions. Handle all 15 guidance cases. This is the MOST CRITICAL analytical output."
    )
    green_flags: list[str] = Field(description="3-6 specific positive business signals with evidence")
    red_flags: list[str] = Field(description="1-6 specific warning signals with evidence")
    management_execution_score: int = Field(ge=1, le=10, description="1-10 delivery on past promises")
    key_quotes: list[str] = Field(description="4-8 revealing direct management quotes that show intent, confidence, or risk")
    lynch_category: str = Field(description="Fast Grower / Stalwart / Slow Grower / Cyclical / Turnaround")
    confidence: float = Field(ge=0.0, le=1.0, description="Extraction confidence 0-1")

    business_model: Optional[str] = Field(default=None, description="2-3 sentence business description")
    moat_signals: list[str] = Field(default_factory=list, description="Evidence of competitive advantage")
    competitive_advantages: list[str] = Field(default_factory=list, description="What keeps competitors out")

    revenue_cr: Optional[float] = Field(default=None, description="Revenue ₹ crore this quarter")
    ebitda_cr: Optional[float] = Field(default=None, description="EBITDA ₹ crore")
    pat_cr: Optional[float] = Field(default=None, description="PAT ₹ crore")
    ebitda_margin_pct: Optional[float] = Field(default=None, description="EBITDA margin %")
    pat_margin_pct: Optional[float] = Field(default=None, description="PAT margin %")
    revenue_growth_yoy_pct: Optional[float] = Field(default=None, description="Revenue YoY growth %")
    pat_growth_yoy_pct: Optional[float] = Field(default=None, description="PAT YoY growth %")

    guidance_trajectory: Optional[str] = Field(default=None, description="up / down / flat")
    guidance_trajectory_detail: Optional[str] = Field(default=None, description="Narrative of trajectory")
    contradictions: list[str] = Field(default_factory=list, description="Cross-quarter contradictions")

    capex_plans: list[str] = Field(default_factory=list, description="Capex with amounts and timelines")
    capacity_utilization: Optional[str] = Field(default=None, description="Capacity utilization %")
    geographic_expansion: list[str] = Field(default_factory=list, description="New geographies")

    investment_thesis: list[str] = Field(default_factory=list, description="3 bullets: growth case, risks, exit trigger")
    sector_best_pick_rationale: Optional[str] = Field(default=None, description="Best car in sector?")


# ---------------------------------------------------------------------------
# Main analysis function
# ---------------------------------------------------------------------------

def _repair_truncated_json(raw: str) -> str:
    """Attempt to repair JSON truncated mid-generation by Gemini.

    Common truncation patterns:
      - Cut inside a string value → close the string, close all open brackets
      - Cut after a comma → remove trailing comma, close brackets
      - Cut mid-key → remove partial key, close brackets
    """
    text = raw.rstrip()
    if not text:
        return text

    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass

    in_string = False
    escape = False
    stack: list[str] = []

    for ch in text:
        if escape:
            escape = False
            continue
        if ch == "\\":
            if in_string:
                escape = True
            continue
        if ch == '"' and not escape:
            in_string = not in_string
            continue
        if not in_string:
            if ch in ("{", "["):
                stack.append(ch)
            elif ch in ("}", "]"):
                if stack:
                    stack.pop()

    repaired = text
    if in_string:
        repaired += '"'

    repaired = repaired.rstrip().rstrip(",")

    for opener in reversed(stack):
        repaired += "}" if opener == "{" else "]"

    try:
        json.loads(repaired)
        return repaired
    except json.JSONDecodeError:
        pass

    repaired_v2 = re.sub(r',\s*([}\]])', r'\1', repaired)
    try:
        json.loads(repaired_v2)
        return repaired_v2
    except json.JSONDecodeError:
        pass

    return raw


def analyze_concall_gemini(
    text: str,
    quarter_hint: str = "",
    prev_analysis_json: Optional[str] = None,
    symbol: str = "",
    sector: str = "",
) -> tuple[ConCallAnalysis, dict]:
    """Analyze a con-call transcript using Gemini structured output.

    Returns (analysis, usage_meta) where usage_meta contains token counts,
    model info, attempt count, and timing for analytics storage.
    """

    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY not configured in .env")

    client = genai.Client(api_key=settings.gemini_api_key)

    user_prompt = _build_user_prompt(
        text=text,
        quarter_hint=quarter_hint,
        prev_analysis_json=prev_analysis_json,
        symbol=symbol,
        sector=sector,
    )

    last_error: Exception | None = None
    total_input_tokens = 0
    total_output_tokens = 0
    total_attempts = 0
    json_repaired = False

    import time
    wall_start = time.monotonic()

    for attempt in range(_MAX_RETRIES + 1):
        total_attempts = attempt + 1
        token_limit = 65536 if attempt > 0 else 32768

        logger.info(
            "Calling Gemini (model=%s, text_len=%d, symbol=%s, attempt=%d, max_tokens=%d)...",
            settings.gemini_model,
            len(text),
            symbol,
            attempt + 1,
            token_limit,
        )

        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=[
                    {"role": "user", "parts": [{"text": _SYSTEM_PROMPT + "\n\n" + user_prompt}]},
                ],
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": _GeminiAnalysisSchema.model_json_schema(),
                    "temperature": 0.15,
                    "max_output_tokens": token_limit,
                },
            )

            usage = getattr(response, "usage_metadata", None)
            if usage:
                total_input_tokens += getattr(usage, "prompt_token_count", 0) or 0
                total_output_tokens += getattr(usage, "candidates_token_count", 0) or 0

            raw_text = response.text or ""
            logger.info("Gemini response received (%d chars, attempt=%d)", len(raw_text), attempt + 1)

            if not raw_text.strip():
                raise ValueError("Gemini returned empty response")

            try:
                parsed = _GeminiAnalysisSchema.model_validate_json(raw_text)
            except ValidationError:
                logger.warning(
                    "JSON validation failed (attempt=%d), attempting repair...", attempt + 1
                )
                repaired = _repair_truncated_json(raw_text)
                if repaired != raw_text:
                    logger.info("JSON repaired (%d → %d chars)", len(raw_text), len(repaired))
                    json_repaired = True
                parsed = _GeminiAnalysisSchema.model_validate_json(repaired)

            model_fields = set(ConCallAnalysis.model_fields.keys())
            fields = {k: v for k, v in parsed.model_dump().items() if k in model_fields}
            fields["analysis_provider"] = "gemini"

            if quarter_hint and (not fields.get("quarter") or fields["quarter"] == "Unknown"):
                fields["quarter"] = quarter_hint

            analysis = ConCallAnalysis(**fields)

            wall_elapsed = round(time.monotonic() - wall_start, 2)

            logger.info(
                "Gemini analysis complete: quarter=%s, tone=%d, highlights=%d, "
                "structured_guidance=%d, legacy_guidance=%d, thesis=%d, summary=%d chars, "
                "input_tokens=%d, output_tokens=%d, attempts=%d, wall_time=%.1fs",
                analysis.quarter,
                analysis.tone_score,
                len(analysis.highlights),
                len(analysis.structured_guidance),
                len(analysis.guidance),
                len(analysis.investment_thesis),
                len(analysis.detailed_summary),
                total_input_tokens,
                total_output_tokens,
                total_attempts,
                wall_elapsed,
            )

            usage_meta = {
                "model": settings.gemini_model,
                "provider": "gemini",
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
                "total_tokens": total_input_tokens + total_output_tokens,
                "input_text_chars": len(text),
                "output_text_chars": len(raw_text),
                "system_prompt_chars": len(_SYSTEM_PROMPT),
                "prev_context_chars": len(prev_analysis_json) if prev_analysis_json else 0,
                "attempts": total_attempts,
                "max_output_tokens_used": token_limit,
                "json_repaired": json_repaired,
                "wall_time_seconds": wall_elapsed,
                "temperature": 0.15,
            }

            return analysis, usage_meta

        except Exception as e:
            last_error = e
            logger.warning(
                "Gemini attempt %d/%d failed: %s",
                attempt + 1,
                _MAX_RETRIES + 1,
                str(e)[:300],
            )
            if attempt < _MAX_RETRIES:
                continue
            raise last_error  # type: ignore[misc]

    raise last_error or RuntimeError("All Gemini attempts failed")


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_user_prompt(
    text: str,
    quarter_hint: str,
    prev_analysis_json: Optional[str],
    symbol: str,
    sector: str,
) -> str:
    """Build the user prompt with context and transcript."""

    parts: list[str] = []

    parts.append("CONTEXT:")
    if symbol:
        parts.append(f"- Company Symbol: {symbol}")
    if sector:
        parts.append(f"- Sector: {sector}")
    if quarter_hint:
        parts.append(f"- Expected Quarter: {quarter_hint}")

    if prev_analysis_json:
        parts.append(f"""
PREVIOUS QUARTERS ANALYSIS (use this to track guidance fulfillment, revisions, and contradictions):
{prev_analysis_json}

CRITICAL INSTRUCTIONS FOR CROSS-QUARTER COMPARISON:
1. For each guidance metric in the previous quarter(s), determine:
   - Was it MET, MISSED, or PARTIALLY met in the current quarter's reported numbers?
   - Is the SAME guidance being maintained, raised, lowered, or withdrawn now?
2. For structured_guidance items:
   - If management repeats similar guidance → revision="maintained"
   - If numbers are higher than last quarter → revision="raised"
   - If numbers are lower → revision="lowered"
   - If a previously guided metric is not mentioned → do NOT create a "continued" item (only include what was actually discussed)
   - If management explicitly says "we remain on track" → revision="maintained", guidance_type="continued"
3. Flag any contradictions where management said one thing last quarter but something different now.
4. Determine overall trajectory: is the guidance direction accelerating (up), decelerating (down), or stable (flat)?""")

    parts.append(f"\nFULL TRANSCRIPT (analyze every section thoroughly — do NOT truncate or skip any part):\n{text}")

    return "\n".join(parts)
