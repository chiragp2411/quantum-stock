# Feature: Forward Valuation & Scenario Analysis

## Overview

The valuation feature implements Peter Lynch's approach to stock valuation using a 4-phase matrix based on PEG ratio and growth rate. Users can run base/bull/bear scenario analysis with adjustable growth rates to determine which "phase of the race" a stock is in.

## The 4-Phase Valuation Matrix

Inspired by Lynch's framework, stocks are classified into one of four phases based on their PEG ratio and growth rate:

```
                    High Growth (≥15%)          Low Growth (<10%)
                ┌─────────────────────────┬─────────────────────────┐
Low PE/Growth   │  Phase 1: BARGAIN       │  Phase 4: TURNAROUND    │
(PEG ≤ 1.0)    │  "Pole Position"        │  "Back on Track"        │
                │  Action: Buy/Add        │  Action: Watch closely  │
                ├─────────────────────────┼─────────────────────────┤
High PE/Growth  │  Phase 2: MOMENTUM      │  Phase 3: TRAP          │
(PEG > 1.5)    │  "Leading the Pack"     │  "Pit Stop Needed"      │
                │  Action: Hold/Monitor   │  Action: Exit           │
                └─────────────────────────┴─────────────────────────┘
```

### Phase Determination Logic

```python
def determine_phase(peg, growth):
    if peg <= 1.0 and growth >= 15:  return Phase 1  # Bargain
    if peg > 1.5 and growth >= 15:   return Phase 2  # Momentum
    if peg > 1.5 and growth < 10:    return Phase 3  # Trap
    if peg <= 1.0 and growth < 10:   return Phase 4  # Turnaround
    # Edge cases (PEG 1.0-1.5 or growth 10-15%)
    if growth >= 15:  return Phase 2
    if peg <= 1.0:    return Phase 4
    return Phase 3
```

**Files:** `app/valuation/calculator.py` → `determine_phase()`

## Scenario Calculations

### Formulas

For each scenario (Base, Bull, Bear):

| Metric | Formula | Description |
|--------|---------|-------------|
| **Forward EPS** | `Current EPS × (1 + growth_rate/100)` | Projected next-year EPS |
| **Forward PAT** | `Forward EPS × shares_outstanding` | Projected profit after tax |
| **Forward PE** | `Current Price / Forward EPS` | What PE would be at forward earnings |
| **PEG** | `Forward PE / growth_rate` | Price-to-earnings-growth ratio |
| **Fair Value** | `Current EPS × growth_rate` | Lynch's rule: PE should equal growth rate |
| **Upside %** | `(Fair Value - CMP) / CMP × 100` | Potential gain/loss from current price |

### Scenario Deltas

- **Base case:** Uses the user-specified growth rate directly
- **Bull case:** `growth_rate + bull_delta` (default: +10%)
- **Bear case:** `max(growth_rate - bear_delta, 0.01)` (default: -10%, floored at 0.01%)

**Files:** `app/valuation/calculator.py` → `calculate_scenario()`, `calculate_valuation()`

## Car Race Analogy

The UI uses racing metaphors to make financial concepts accessible:

| Phase | Race Analogy | Description |
|-------|-------------|-------------|
| Phase 1 | Pole Position | Stock is undervalued with high growth — best starting position |
| Phase 2 | Leading the Pack | Growing fast but priced for it — maintaining lead |
| Phase 3 | Pit Stop Needed | Overvalued with slowing growth — time to pull over |
| Phase 4 | Back on Track | Low valuation, low growth — potential comeback |

## Data Flow

```
1. User sets growth rate + deltas on frontend sliders
2. Frontend sends POST /api/valuation/{symbol}/calculate
3. Backend checks for EPS and Price:
   a. If provided manually → use those
   b. If not → check stocks collection in MongoDB
   c. If not in DB → fetch from yfinance
   d. If all fail → return 400 error
4. Run calculate_valuation() for base/bull/bear
5. Determine overall phase from base case PEG + growth
6. Save result to valuations collection
7. Return ValuationResult to frontend
```

## Frontend Integration

- **Sensitivity sliders:** Adjust growth rate (0-60%), bull delta (0-30%), bear delta (0-30%)
- **Auto-recalculate:** After first calculation, slider changes trigger debounced recalculation (500ms delay)
- **Pre-population:** Growth rate slider is pre-populated from the stock's `eps_growth` field when available
- **Phase speedometer:** Doughnut chart highlighting the current phase quadrant
- **Scenario cards:** Three cards (Bear/Base/Bull) showing all calculated metrics with color coding

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/valuation/{symbol}/calculate` | Run scenario analysis |
| GET | `/api/valuation/{symbol}/latest` | Get most recent saved valuation |

## Related Files

| File | Purpose |
|------|---------|
| `app/valuation/router.py` | HTTP endpoints for calculate and latest |
| `app/valuation/calculator.py` | Core calculation logic and phase determination |
| `app/valuation/models.py` | Phase enum, ScenarioInput, ScenarioResult, ValuationResult |
| `app/stocks/yfinance_service.py` | Fallback data source for EPS and price |
