"""Pydantic models for con-call analysis and guidance tracking."""

from typing import Optional
from pydantic import BaseModel, Field


class ConCallAnalysis(BaseModel):
    """Structured output from LLM analysis of a con-call transcript."""
    quarter: str = Field(..., description="e.g. Q3FY25")
    detailed_summary: str = Field(
        default="",
        description="Comprehensive markdown analysis of the earnings call (500-800 words)",
    )
    highlights: list[str] = Field(
        default_factory=list,
        description="8-12 specific, quantitative key takeaways",
    )
    tone_score: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Management tone: 1=very bearish, 10=very bullish",
    )
    guidance: dict[str, str] = Field(
        default_factory=dict,
        description="Forward guidance: {'revenue': '15-17% growth', 'margin': '22-24%'}",
    )
    green_flags: list[str] = Field(
        default_factory=list,
        description="Positive signals from the call",
    )
    red_flags: list[str] = Field(
        default_factory=list,
        description="Warning signals from the call",
    )
    management_execution_score: int = Field(
        default=5,
        ge=1,
        le=10,
        description="How well management delivered on past promises: 1=poor, 10=excellent",
    )
    key_quotes: list[str] = Field(
        default_factory=list,
        description="Direct quotes from management",
    )
    lynch_category: str = Field(
        default="",
        description="Lynch classification: Fast Grower, Stalwart, etc.",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence score",
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


class ManualOverride(BaseModel):
    """Manual override for actuals when yfinance data is unavailable."""
    revenue: Optional[float] = None
    pat: Optional[float] = None
    eps: Optional[float] = None
    margin: Optional[float] = None
