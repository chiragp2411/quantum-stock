"""Gemini-powered con-call transcript analyzer with structured output.

Replaces SpaCy + Ollama with a single Gemini call that returns
all analysis fields as structured JSON matching the ConCallAnalysis schema.
"""

import json
import logging
from typing import Optional

from google import genai
from pydantic import BaseModel, Field

from app.config import settings
from app.concalls.models import ConCallAnalysis

logger = logging.getLogger(__name__)

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

=== OTHER FIELD EXTRACTION RULES ===

1. All monetary amounts in ₹ crore (cr). All percentages as whole numbers.
2. Every highlight MUST contain specific numbers from the transcript — no generic statements.
3. Guidance = ONLY management's own forward-looking statements WITH numbers.
   Distinguish management's own guidance from analyst questions/estimates.
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
    guidance: dict[str, str] = Field(description="Forward guidance by metric with numbers: {'revenue_growth': '25-28%', 'capex': '₹200 cr FY27'}")
    green_flags: list[str] = Field(description="3-6 specific positive business signals with evidence")
    red_flags: list[str] = Field(description="1-6 specific warning signals with evidence")
    management_execution_score: int = Field(ge=1, le=10, description="1-10 delivery on past promises")
    key_quotes: list[str] = Field(description="4-8 revealing direct management quotes that show intent, confidence, or risk")
    lynch_category: str = Field(description="Fast Grower / Stalwart / Slow Grower / Cyclical / Turnaround")
    confidence: float = Field(ge=0.0, le=1.0, description="Extraction confidence 0-1")

    business_model: Optional[str] = Field(default=None, description="2-3 sentence business description: what they do, who pays, how they earn")
    moat_signals: list[str] = Field(default_factory=list, description="Specific evidence of competitive advantage from the call")
    competitive_advantages: list[str] = Field(default_factory=list, description="What keeps competitors out — with evidence")

    revenue_cr: Optional[float] = Field(default=None, description="Revenue ₹ crore this quarter")
    ebitda_cr: Optional[float] = Field(default=None, description="EBITDA ₹ crore")
    pat_cr: Optional[float] = Field(default=None, description="PAT ₹ crore")
    ebitda_margin_pct: Optional[float] = Field(default=None, description="EBITDA margin %")
    pat_margin_pct: Optional[float] = Field(default=None, description="PAT margin %")
    revenue_growth_yoy_pct: Optional[float] = Field(default=None, description="Revenue YoY growth %")
    pat_growth_yoy_pct: Optional[float] = Field(default=None, description="PAT YoY growth %")

    guidance_trajectory: Optional[str] = Field(default=None, description="up / down / flat based on guidance revision direction")
    guidance_trajectory_detail: Optional[str] = Field(default=None, description="Narrative: e.g. 'Revenue guidance raised from 25% to 30%'")
    contradictions: list[str] = Field(default_factory=list, description="Cross-quarter contradictions if previous analysis provided")

    capex_plans: list[str] = Field(default_factory=list, description="Capex with ₹ amounts, timelines, and locations")
    capacity_utilization: Optional[str] = Field(default=None, description="Capacity utilization % if mentioned")
    geographic_expansion: list[str] = Field(default_factory=list, description="New geographies, states, markets being entered")

    investment_thesis: list[str] = Field(default_factory=list, description="Exactly 3 bullets: growth case, key risks, exit trigger")
    sector_best_pick_rationale: Optional[str] = Field(default=None, description="Is this the best car in its sector? Why or why not?")


def analyze_concall_gemini(
    text: str,
    quarter_hint: str = "",
    prev_analysis_json: Optional[str] = None,
    symbol: str = "",
    sector: str = "",
) -> ConCallAnalysis:
    """Analyze a con-call transcript using Gemini structured output."""

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

    logger.info(
        "Calling Gemini (model=%s, text_len=%d, symbol=%s)...",
        settings.gemini_model,
        len(text),
        symbol,
    )

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[
            {"role": "user", "parts": [{"text": _SYSTEM_PROMPT + "\n\n" + user_prompt}]},
        ],
        config={
            "response_mime_type": "application/json",
            "response_json_schema": _GeminiAnalysisSchema.model_json_schema(),
            "temperature": 0.15,
            "max_output_tokens": 16384,
        },
    )

    raw_text = response.text
    logger.info("Gemini response received (%d chars)", len(raw_text))

    parsed = _GeminiAnalysisSchema.model_validate_json(raw_text)

    model_fields = set(ConCallAnalysis.model_fields.keys())
    fields = {k: v for k, v in parsed.model_dump().items() if k in model_fields}
    fields["analysis_provider"] = "gemini"

    if quarter_hint and (not fields.get("quarter") or fields["quarter"] == "Unknown"):
        fields["quarter"] = quarter_hint

    analysis = ConCallAnalysis(**fields)

    logger.info(
        "Gemini analysis complete: quarter=%s, tone=%d, highlights=%d, guidance=%d, "
        "thesis=%d, summary=%d chars",
        analysis.quarter,
        analysis.tone_score,
        len(analysis.highlights),
        len(analysis.guidance),
        len(analysis.investment_thesis),
        len(analysis.detailed_summary),
    )

    return analysis


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
PREVIOUS QUARTER ANALYSIS (use this to track guidance fulfillment and detect contradictions):
{prev_analysis_json}

For each metric in the previous quarter's guidance, state whether it was met/missed.
Flag any contradictions where management said one thing last quarter but something different now.
Determine trajectory: is guidance being raised (up), maintained (flat), or cut (down)?""")

    parts.append(f"\nFULL TRANSCRIPT (analyze every section thoroughly — do NOT truncate or skip any part):\n{text}")

    return "\n".join(parts)
