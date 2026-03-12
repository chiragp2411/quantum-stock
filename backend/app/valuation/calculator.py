"""Forward valuation calculator implementing Lynch's 4-phase matrix."""

from app.valuation.models import (
    Phase,
    PHASE_LABELS,
    ScenarioResult,
    ValuationResult,
)


def determine_phase(peg: float, growth: float) -> Phase:
    """Determine which of the 4 valuation phases a stock is in.

    Phase 1: Low PE relative to growth (PEG < 1) + High Growth (>15%) = Bargain
    Phase 2: High PE relative to growth (PEG > 1.5) + High Growth (>15%) = Hold
    Phase 3: High PE relative to growth (PEG > 1.5) + Low Growth (<10%) = Trap
    Phase 4: Low PE relative to growth (PEG < 1) + Low Growth (<10%) = Turnaround
    """
    if peg <= 1.0 and growth >= 15:
        return Phase.PHASE_1
    if peg > 1.5 and growth >= 15:
        return Phase.PHASE_2
    if peg > 1.5 and growth < 10:
        return Phase.PHASE_3
    if peg <= 1.0 and growth < 10:
        return Phase.PHASE_4

    if growth >= 15:
        return Phase.PHASE_2
    if peg <= 1.0:
        return Phase.PHASE_4
    return Phase.PHASE_3


def calculate_scenario(
    label: str,
    growth_rate: float,
    current_eps: float,
    current_price: float,
    shares_outstanding_cr: float = 1.0,
) -> ScenarioResult:
    """Calculate forward valuation for a single scenario.

    Forward EPS = Current EPS * (1 + growth/100)
    Forward PAT = Forward EPS * shares_outstanding (in crores)
    Forward PE = Current Price / Forward EPS
    PEG = Forward PE / growth_rate
    Fair Value = Current EPS * growth_rate (Lynch's rule of thumb: PE = Growth)
    Upside = (Fair Value - CMP) / CMP * 100
    """
    if growth_rate <= 0:
        growth_rate = 0.01

    forward_eps = current_eps * (1 + growth_rate / 100)
    forward_pat = forward_eps * shares_outstanding_cr
    forward_pe = current_price / forward_eps if forward_eps > 0 else 0
    peg = forward_pe / growth_rate if growth_rate > 0 else 0

    fair_value = current_eps * growth_rate
    upside_pct = ((fair_value - current_price) / current_price * 100) if current_price > 0 else 0

    phase = determine_phase(peg, growth_rate)

    return ScenarioResult(
        label=label,
        growth_rate=round(growth_rate, 2),
        forward_eps=round(forward_eps, 2),
        forward_pat=round(forward_pat, 2),
        forward_pe=round(forward_pe, 2),
        peg=round(peg, 2),
        fair_value=round(fair_value, 2),
        upside_pct=round(upside_pct, 2),
        phase=phase.value,
        phase_label=PHASE_LABELS[phase],
    )


def calculate_valuation(
    symbol: str,
    growth_rate: float,
    bull_delta: float,
    bear_delta: float,
    current_eps: float,
    current_price: float,
    shares_outstanding_cr: float = 1.0,
) -> ValuationResult:
    """Run base/bull/bear scenario analysis for a stock."""
    current_pe = current_price / current_eps if current_eps > 0 else 0

    base = calculate_scenario("Base", growth_rate, current_eps, current_price, shares_outstanding_cr)
    bull = calculate_scenario("Bull", growth_rate + bull_delta, current_eps, current_price, shares_outstanding_cr)
    bear = calculate_scenario("Bear", max(growth_rate - bear_delta, 0.01), current_eps, current_price, shares_outstanding_cr)

    overall_phase = determine_phase(base.peg, growth_rate)

    return ValuationResult(
        symbol=symbol,
        current_price=round(current_price, 2),
        current_eps=round(current_eps, 2),
        current_pe=round(current_pe, 2),
        base=base,
        bull=bull,
        bear=bear,
        overall_phase=overall_phase.value,
        overall_phase_label=PHASE_LABELS[overall_phase],
    )
