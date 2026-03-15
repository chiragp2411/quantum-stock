# Feature: Forward Valuation & Scenario Analysis

## Overview

The valuation feature implements a forward-looking, PEG-based valuation with a 4-phase matrix. Growth rates are auto-filled from con-call guidance when available, making the valuation directly tied to management's own projections.

**Key principle: Full transparency.** Every number on the valuation page is traceable — the user sees exactly which con-call, which quarter, which guidance field, and what assumptions were made.

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

## Full Transparency: What the Page Shows

### 1. Forward Period
The system calculates which fiscal year the valuation targets:
- Concall from Q1-Q3 of FYxx → Valuation for FYxx (current year projections)
- Concall from Q4 of FYxx → Valuation for FY(xx+1) (next year)

This is displayed prominently as a badge (e.g., "Valuation for FY27").

### 2. Source Con-Call
The exact concall used is shown:
- Quarter (e.g., "Q3FY26")
- Filename (e.g., "CompanyXYZ_Q3FY26_ConcallTranscript.pdf")
- Link to view the full con-call analysis

### 3. Management's Exact Guidance
All guidance fields extracted from the con-call are displayed in a grid:
- Each metric shows the raw text from management (e.g., "30-35% revenue growth")
- The specific field used for the growth rate is highlighted with a "USED" badge
- If a fallback field was used (e.g., revenue instead of PAT), this is explicitly disclosed

### 4. Assumptions & Disclosures
A prominent warning section lists every assumption:
- "PAT growth not available, using revenue growth as proxy"
- "No guidance found, defaulting to 20%"
- "Using historical PAT growth, not forward guidance"
- "Growth rate manually overridden from X% to Y%"

### 5. Reported Financials
Backward-looking numbers from the same con-call (revenue, EBITDA, PAT, margins, growth) are shown separately with a clear label that these are reported actuals, not forward guidance.

### 6. Confidence Scores
- Tone Score (1-10): How confident and transparent management sounds
- Execution Score (1-10): How well management has delivered on past promises

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
4. `revenue_growth` — Revenue growth guidance (disclosed as proxy)
5. **Fallback**: `pat_growth_yoy_pct` — Historical actual PAT growth (disclosed as backward-looking)

### Handling Missing Guidance

| Situation | What Happens | User Sees |
|-----------|-------------|-----------|
| PAT growth guidance exists | Uses directly | "PAT Growth (management guidance): 30%" |
| Only revenue guidance | Uses revenue growth | Warning: "Using revenue growth as proxy — PAT may differ" |
| No guidance, but historical data | Uses pat_growth_yoy_pct | Warning: "Using historical PAT growth, not forward guidance" |
| Nothing available | Returns null, frontend defaults to 20% | Warning: "No guidance found — defaults to 20%. Override with your research." |
| No concalls analyzed | Returns null | Large prompt to upload con-calls |
| User overrides slider | Uses user's value | Shows both: guidance was X%, you set Y% |

## Scenario Analysis

Three scenarios are calculated with adjustable deltas:

| Scenario | Growth Rate | Default Delta |
|----------|-------------|---------------|
| Base | User-specified (or auto-filled) | — |
| Bull | Base + bull_delta | +10% |
| Bear | max(Base - bear_delta, 0.01%) | -10% |

## API: Guidance Prefill Response

The `GET /api/valuation/{symbol}/guidance-prefill` endpoint returns:

```json
{
  "symbol": "RELIANCE.NS",
  "suggested_growth": 25.0,
  "source": "pat_growth",
  "source_label": "PAT Growth (management guidance)",
  "source_raw_value": "25-30% PAT growth expected",
  "trajectory": "up",
  "trajectory_detail": "Growth guidance revised upward from 20% last quarter",
  "quarter": "Q3FY26",
  "forward_period": "FY26",
  "concall_filename": "Reliance_Q3FY26_Concall.pdf",
  "analyzed_at": "2026-03-15T10:30:00+00:00",
  "full_guidance": {
    "revenue_growth": "15-18% revenue growth",
    "pat_growth": "25-30% PAT growth expected",
    "ebitda_margin": "Targeting 28% EBITDA margin",
    "capex": "Rs 5000 cr capex planned"
  },
  "financials_extracted": {
    "revenue_cr": 15000,
    "pat_cr": 2500,
    "ebitda_margin_pct": 26.5,
    "pat_growth_yoy_pct": 22.3
  },
  "tone_score": 8,
  "execution_score": 7,
  "assumptions": [],
  "total_concalls_analyzed": 4
}
```

## Data Flow

```
1. User opens valuation page
2. Frontend calls GET /api/valuation/{symbol}/guidance-prefill
3. Backend finds latest concall by fiscal quarter
4. Extracts growth rate from guidance fields (priority order)
5. Returns full transparency: source, raw value, assumptions, forward period
6. Frontend shows "Data Source & Transparency" card with all details
7. Any assumptions/warnings are shown prominently
8. User adjusts sliders → POST /api/valuation/{symbol}/calculate
9. Backend calculates 3 scenarios, determines phase
10. Result saved to valuations collection
11. Frontend shows phase speedometer + scenario cards + methodology
```

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/{symbol}/calculate` | Yes | Run scenario analysis |
| GET | `/{symbol}/latest` | No | Get most recent saved valuation |
| GET | `/{symbol}/guidance-prefill` | No | Get growth rate + full transparency data |

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `valuation/page.tsx` | Main page: transparency section, sliders, calculate, results |
| `scenario-panel.tsx` | Base/Bull/Bear cards with metrics |
| `phase-speedometer.tsx` | Doughnut chart showing current phase |
| `sensitivity-slider.tsx` | Growth rate and delta sliders |

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/valuation/router.py` | API endpoints + guidance prefill with full transparency |
| `backend/app/valuation/calculator.py` | Core calculation logic |
| `backend/app/valuation/models.py` | Phase enum, input/output models |
