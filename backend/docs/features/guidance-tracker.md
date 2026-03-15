# Feature: Guidance Tracker & Management Credibility

## Overview

The Guidance Tracker is the heart of the investment process. It builds a quarter-over-quarter view showing whether management is "walking the talk" — did they deliver what they promised?

## How It Works

### Data Flow

1. Each analyzed concall extracts `guidance` (forward-looking numbers) and `prev_guidance_comparison`
2. The tracker endpoint iterates concalls chronologically (oldest → newest by `uploaded_at`)
3. For each quarter:
   - Previous quarter's `guidance` → this quarter's `prev_guidance`
   - Current quarter's actuals from `financials` collection (or analysis) → `actuals`
   - Comparison determines `met_missed` status
4. Current quarter's `guidance` → becomes next quarter's `prev_guidance`

### Actuals Source

- **Primary**: `financials` collection — keyed by `stock_symbol` + `period` (quarter)
- **Manual override**: Users can set revenue, pat, eps, margin via `PUT /{symbol}/{id}/override`
- **Fallback**: When financials are empty, `met_missed` is "pending"

### Tracker Table Columns

| Column | Description |
|--------|-------------|
| Period | Fiscal quarter (e.g., Q3FY26) |
| Previous Guidance | What management guided last quarter |
| Actuals | What was actually delivered (from financials or override) |
| Delivered | Met / Missed / Partial / Pending |
| New Guidance | What they are guiding for next quarter |
| Trajectory | Up ↑ / Down ↓ / Flat → |
| Override | Manual override button (hover) |

### Met/Missed Evaluation Logic

- Compares numeric values from `prev_guidance` dict to `actuals` dict
- **Met**: actual ≥ 95% of guided target
- **Missed**: actual < 95% of guided target
- **Partial**: Some metrics met, some missed
- **Pending**: No actuals available for comparison

## Management Credibility Score

Aggregated from all tracked quarters:

- **High Reliability (≥80%)**: "Veteran Driver" — management consistently delivers
- **Medium Reliability (50-79%)**: "Developing Driver" — mixed track record
- **Low Reliability (<50%)**: "Unreliable Driver" — frequently misses guidance

Formula: `(met_count + 0.5 * partial_count) / total_tracked * 100`

### Response Shape

```json
{
  "hit_rate_pct": 75,
  "quarters_tracked": 4,
  "quarters_met": 3
}
```

## Contradiction Detector

When previous quarter analysis is available, Gemini compares:

- Previous guidance vs current results
- Previous tone vs current tone
- Flags specific contradictions (e.g., "Guided 25% growth but delivered only 15%")

Contradictions are stored in `analysis.contradictions` and displayed in the tracker.

## Financial Time-Series

Extracts KPIs from all analyzed concalls for charting:

- Revenue, EBITDA, PAT (₹ cr)
- EBITDA margin %, PAT margin %
- Revenue growth YoY %, PAT growth YoY %
- Tone score, Execution score

Three chart tabs:

1. **Revenue / PAT** — Bar chart showing absolute numbers
2. **Margins** — Line chart showing margin trends
3. **Growth %** — Line chart showing growth rate trends

## API

Part of the concalls tracker endpoint: `GET /api/concalls/{symbol}/tracker`

### Response

```json
{
  "symbol": "SGMART.NS",
  "tracker": [...],
  "credibility": { "hit_rate_pct": 75, "quarters_tracked": 4, "quarters_met": 3 },
  "financial_timeseries": [...]
}
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/concalls/router.py` | `guidance_tracker()`, `_evaluate_guidance()`, `_calc_credibility()`, `_build_financial_timeseries()` |
| `frontend/src/components/concalls/tracker-table.tsx` | Tracker table with Met/Missed badges |
| `frontend/src/components/concalls/guidance-trend-chart.tsx` | Tone & execution score trends |
| `frontend/src/components/concalls/financial-kpi-chart.tsx` | Revenue/Margins/Growth charts |
| `frontend/src/components/concalls/credibility-badge.tsx` | Management reliability badge |
