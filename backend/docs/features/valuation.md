# Feature: Forward Valuation & Scenario Analysis

## Overview

The valuation feature implements a forward-looking, PEG-based valuation with a 4-phase matrix. Growth rates are auto-filled from con-call guidance when available, making the valuation directly tied to management's own projections.

## The 4-Phase Valuation Matrix (Car Race Analogy)

Every stock is classified into one of four phases based on PEG ratio and growth:

| Phase | PEG | Growth | Race Analogy | Action |
|-------|-----|--------|--------------|--------|
| Phase 1: Bargain | ≤ 1.0 | ≥ 15% | Pole Position | Buy / Add heavily |
| Phase 2: Momentum | > 1.5 | ≥ 15% | Leading the Pack | Hold, watch closely |
| Phase 3: Trap | > 1.5 | < 10% | Pit Stop Needed | Exit fast |
| Phase 4: Turnaround | ≤ 1.0 | < 10% | Back on Track | Track for Phase 1 shift |

### Phase Determination Logic

```python
if peg <= 1.0 and growth >= 15:  Phase 1 (Bargain)
if peg > 1.5 and growth >= 15:   Phase 2 (Momentum)
if peg > 1.5 and growth < 10:    Phase 3 (Trap)
if peg <= 1.0 and growth < 10:   Phase 4 (Turnaround)
# Edge cases (PEG 1.0-1.5 or growth 10-15%)
if growth >= 15:  return Phase 2
if peg <= 1.0:    return Phase 4
return Phase 3
```

## Key Formulas

| Metric | Formula |
|--------|---------|
| Forward EPS | Current EPS × (1 + growth_rate / 100) |
| Forward PAT | Forward EPS × Shares Outstanding |
| Forward P/E | Current Price / Forward EPS |
| PEG | Forward P/E / Growth Rate |
| Fair Value | Current EPS × Growth Rate |
| Upside % | (Fair Value - CMP) / CMP × 100 |

## Guidance Auto-Fill (Con-Call Integration)

### How "Latest Concall" Is Determined

The system finds the latest concall by **fiscal quarter** (not upload date), so uploading concalls in any order works correctly:

1. Fetches all completed concalls for the stock (up to 20)
2. Parses the `quarter` field (e.g., "Q3FY26" → sort key "2026-3")
3. Sorts by fiscal quarter descending
4. Uses the most recent quarter's guidance

### What Forward Data Is Extracted

The system looks for these fields in priority order from `analysis.guidance`:

1. `pat_growth` or `pat_growth_pct` — PAT growth guidance (preferred)
2. `pat` — Absolute PAT guidance
3. `earnings_growth` — Earnings growth guidance
4. `revenue_growth` — Revenue growth guidance
5. **Fallback**: `pat_growth_yoy_pct` — Historically extracted actual PAT growth

### Handling Missing Guidance

- If the concall has revenue guidance but no PAT guidance → uses revenue_growth
- If ALL guidance fields are empty → falls back to extracted `pat_growth_yoy_pct`
- If even that is null → returns `suggested_growth: null`, frontend defaults to 20%
- The auto-fill is always visible to the user with source attribution (which field and quarter it came from)
- User can always override the auto-filled value manually

## Scenario Analysis

Three scenarios are calculated with adjustable deltas:

| Scenario | Growth Rate | Default Delta |
|----------|-------------|---------------|
| Base | User-specified (or auto-filled) | — |
| Bull | Base + bull_delta | +10% |
| Bear | max(Base - bear_delta, 0.01%) | -10% |

## Data Flow

```
1. User opens valuation page
2. Frontend calls GET /api/valuation/{symbol}/guidance-prefill
3. Backend finds latest concall by fiscal quarter
4. Extracts growth rate from guidance fields
5. Frontend auto-fills growth slider + shows source banner
6. User adjusts sliders → POST /api/valuation/{symbol}/calculate
7. Backend calculates 3 scenarios, determines phase
8. Result saved to valuations collection
9. Frontend shows phase speedometer + scenario cards
```

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/{symbol}/calculate` | Yes | Run scenario analysis |
| GET | `/{symbol}/latest` | No | Get most recent saved valuation |
| GET | `/{symbol}/guidance-prefill` | No | Get growth rate from latest concall guidance |

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `valuation/page.tsx` | Main page: sliders, calculate button, results |
| `scenario-panel.tsx` | Base/Bull/Bear cards with metrics |
| `phase-speedometer.tsx` | Doughnut chart showing current phase |
| `sensitivity-slider.tsx` | Growth rate and delta sliders |

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/valuation/router.py` | API endpoints + guidance prefill |
| `backend/app/valuation/calculator.py` | Core calculation logic |
| `backend/app/valuation/models.py` | Phase enum, input/output models |
