"""Pydantic models for valuation and scenario analysis."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class Phase(str, Enum):
    PHASE_1 = "Phase 1: Bargain (Low PE / High Growth)"
    PHASE_2 = "Phase 2: Momentum (High PE / High Growth)"
    PHASE_3 = "Phase 3: Trap (High PE / Low Growth)"
    PHASE_4 = "Phase 4: Turnaround (Low PE / Low Growth)"


PHASE_LABELS = {
    Phase.PHASE_1: "Pole Position",
    Phase.PHASE_2: "Leading the Pack",
    Phase.PHASE_3: "Pit Stop Needed",
    Phase.PHASE_4: "Back on Track",
}


class ScenarioInput(BaseModel):
    growth_rate: float = Field(..., description="Expected EPS growth rate (%)")
    bull_delta: float = Field(default=10.0, description="Bull case: add this % to growth")
    bear_delta: float = Field(default=10.0, description="Bear case: subtract this % from growth")
    current_eps: Optional[float] = Field(None, description="Override current EPS")
    current_price: Optional[float] = Field(None, description="Override current market price")
    shares_outstanding: Optional[float] = Field(None, description="Override shares outstanding (crores)")


class ScenarioResult(BaseModel):
    label: str
    growth_rate: float
    forward_eps: float
    forward_pat: float
    forward_pe: float
    peg: float
    fair_value: float
    upside_pct: float
    phase: str
    phase_label: str


class ValuationResult(BaseModel):
    symbol: str
    current_price: float
    current_eps: float
    current_pe: float
    base: ScenarioResult
    bull: ScenarioResult
    bear: ScenarioResult
    overall_phase: str
    overall_phase_label: str
