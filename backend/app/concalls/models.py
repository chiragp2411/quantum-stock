"""Pydantic models for con-call analysis and guidance tracking."""

from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Standardized metric keys (used by Gemini and cross-quarter comparison)
# ---------------------------------------------------------------------------
METRIC_CATEGORIES: dict[str, list[str]] = {
    "Growth": [
        "revenue_growth", "pat_growth", "ebitda_growth", "volume_growth",
        "earnings_cagr", "sssg",
    ],
    "Profitability": [
        "revenue", "ebitda", "pat", "ebitda_margin", "pat_margin",
        "gross_margin", "roce", "roe",
    ],
    "Operations": [
        "capex", "store_count", "volume", "capacity", "capacity_utilization",
        "order_book", "market_share", "working_capital_days",
        "geographic_expansion", "employee_count",
    ],
}

METRIC_CATEGORY_LOOKUP: dict[str, str] = {
    metric: cat
    for cat, metrics in METRIC_CATEGORIES.items()
    for metric in metrics
}


class GuidanceItem(BaseModel):
    """One structured forward-guidance item extracted from a con-call."""

    metric: str = Field(
        description="Standardized key from taxonomy: revenue_growth, pat_growth, ebitda, "
        "ebitda_margin, pat, revenue, capex, store_count, volume, sssg, roce, "
        "working_capital_days, capacity, order_book, etc."
    )
    metric_label: str = Field(description="Human-readable label: 'Revenue Growth', 'PAT'")
    period: str = Field(description="Target period: 'FY27', 'Q4FY26', 'FY28', 'long_term'")
    value_text: str = Field(
        description="Raw management language: '₹350 crores+', '25-30%', 'high teens'"
    )
    value_low: Optional[float] = Field(
        default=None, description="Parsed numeric lower bound (25.0 for '25-30%')"
    )
    value_high: Optional[float] = Field(
        default=None, description="Parsed numeric upper bound (30.0 for '25-30%')"
    )
    unit: str = Field(
        default="pct",
        description="Unit: 'pct', 'cr', 'tons', 'stores', 'days', 'x', 'units'"
    )
    guidance_type: str = Field(
        description="explicit_numeric | vague_range | qualitative | conditional | "
        "continued | implicit_confirmation | withdrawn"
    )
    revision: str = Field(
        default="unknown",
        description="new | raised | maintained | lowered | withdrawn | unknown"
    )
    revision_detail: Optional[str] = Field(
        default=None, description="E.g. 'Raised from 25% to 30%'"
    )
    evidence_quote: str = Field(
        default="", description="Exact management quote supporting this guidance"
    )
    confidence: float = Field(
        default=0.8, ge=0.0, le=1.0, description="Extraction confidence"
    )
    conditions: Optional[str] = Field(
        default=None, description="Conditions: 'if monsoon is normal'"
    )
    segment: Optional[str] = Field(
        default=None, description="Business segment: 'Dubai Service Centre', 'Retail'"
    )

    @property
    def category(self) -> str:
        return METRIC_CATEGORY_LOOKUP.get(self.metric, "Other")

    @property
    def value_mid(self) -> Optional[float]:
        if self.value_low is not None and self.value_high is not None:
            return (self.value_low + self.value_high) / 2
        return self.value_low or self.value_high


class ConCallAnalysis(BaseModel):
    """Structured output from LLM analysis of a con-call transcript."""

    quarter: str = Field(..., description="e.g. Q3FY25")
    detailed_summary: str = Field(
        default="",
        description="Comprehensive markdown analysis of the earnings call (600-1000 words)",
    )
    highlights: list[str] = Field(
        default_factory=list,
        description="8-12 specific, quantitative key takeaways with actual numbers from the transcript",
    )
    tone_score: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Management tone: 8-10=specific/confident/data-rich, 5-7=mixed, 1-4=evasive/hedging",
    )
    guidance: dict[str, str] = Field(
        default_factory=dict,
        description="(Legacy) Forward guidance flat dict — kept for backward compat",
    )
    structured_guidance: list[GuidanceItem] = Field(
        default_factory=list,
        description="Structured forward guidance with standardized metrics, numeric ranges, "
        "revision status, evidence quotes, and conditions",
    )
    green_flags: list[str] = Field(
        default_factory=list,
        description="Specific positive business signals: margin expansion, order book growth, market share gain",
    )
    red_flags: list[str] = Field(
        default_factory=list,
        description="Specific warning signals: debt rising, customer concentration, guidance cuts, management exits",
    )
    management_execution_score: int = Field(
        default=5,
        ge=1,
        le=10,
        description="How well management delivered on past promises: 1=poor, 10=excellent",
    )
    key_quotes: list[str] = Field(
        default_factory=list,
        description="Direct revealing quotes from management",
    )
    lynch_category: str = Field(
        default="",
        description="Growth classification: Fast Grower, Stalwart, Slow Grower, Cyclical, Turnaround",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence score",
    )

    # === NEW: Business Model & Moat (Checklist #2) ===
    business_model: Optional[str] = Field(
        default=None,
        description="What the company does, who pays them, how they make money — 2-3 sentences",
    )
    moat_signals: list[str] = Field(
        default_factory=list,
        description="Specific evidence of competitive advantage: pricing power, market share, expansion metrics",
    )
    competitive_advantages: list[str] = Field(
        default_factory=list,
        description="What keeps competitors out: technology, scale, brand, network effects",
    )

    # === NEW: Financial Extraction (Checklist #4) ===
    revenue_cr: Optional[float] = Field(default=None, description="Revenue in ₹ crore for the quarter")
    ebitda_cr: Optional[float] = Field(default=None, description="EBITDA in ₹ crore")
    pat_cr: Optional[float] = Field(default=None, description="PAT in ₹ crore")
    ebitda_margin_pct: Optional[float] = Field(default=None, description="EBITDA margin percentage")
    pat_margin_pct: Optional[float] = Field(default=None, description="PAT margin percentage")
    revenue_growth_yoy_pct: Optional[float] = Field(default=None, description="Revenue YoY growth %")
    pat_growth_yoy_pct: Optional[float] = Field(default=None, description="PAT YoY growth %")

    # === NEW: Guidance Tracking (Checklist #5) ===
    prev_guidance_comparison: Optional[dict[str, dict]] = Field(
        default=None,
        description='Comparison with previous guidance: {"revenue_growth": {"guided": "25%", "actual": "28%", "met": true, "surprise": "+3%"}}',
    )
    guidance_trajectory: Optional[str] = Field(
        default=None,
        description="Trajectory based on guidance revision direction: up / down / flat",
    )
    guidance_trajectory_detail: Optional[str] = Field(
        default=None,
        description="Detailed trajectory narrative: e.g. 'Revenue guidance: 15% → 20% → 30% (accelerating)'",
    )
    contradictions: list[str] = Field(
        default_factory=list,
        description="Cross-quarter contradictions: e.g. 'Said on track in Q2, now says delayed in Q3'",
    )

    # === NEW: Capex & Expansion ===
    capex_plans: list[str] = Field(
        default_factory=list,
        description="Ongoing/planned capex with timelines and amounts",
    )
    capacity_utilization: Optional[str] = Field(
        default=None,
        description="Current capacity utilization % if mentioned",
    )
    geographic_expansion: list[str] = Field(
        default_factory=list,
        description="New regions, markets, or geographies being entered",
    )

    # === NEW: Investment Thesis (Checklist #8) ===
    investment_thesis: list[str] = Field(
        default_factory=list,
        description="3 bullets: 1) Why buy/increase 2) Key risks 3) Switch trigger (exit condition)",
    )
    sector_best_pick_rationale: Optional[str] = Field(
        default=None,
        description="Is this the fastest car in its sector? Why or why not?",
    )

    # === Metadata ===
    analysis_provider: Optional[str] = Field(
        default=None,
        description="Which provider generated this analysis: gemini or ollama",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if LLM analysis failed",
    )


class GuidanceRow(BaseModel):
    """One row in the guidance tracker table."""
    period: str
    tone_score: int = 5
    prev_guidance: dict[str, str] = Field(default_factory=dict)
    actuals: dict[str, str] = Field(default_factory=dict)
    met_missed: str = "pending"
    reasons: str = ""
    new_guidance: dict[str, str] = Field(default_factory=dict)
    trajectory: str = "flat"
    surprise: Optional[str] = Field(default=None, description="Delta vs guidance: e.g. '+3% above guidance'")
    contradictions: list[str] = Field(default_factory=list, description="Cross-quarter contradictions detected")
    structured_new_guidance: list[GuidanceItem] = Field(
        default_factory=list,
        description="Structured guidance items for this quarter (preferred over new_guidance dict)",
    )
    structured_prev_guidance: list[GuidanceItem] = Field(
        default_factory=list,
        description="Structured guidance from the previous quarter for comparison",
    )


class ManualOverride(BaseModel):
    """Manual override for actuals when yfinance data is unavailable."""
    revenue: Optional[float] = None
    pat: Optional[float] = None
    eps: Optional[float] = None
    margin: Optional[float] = None
