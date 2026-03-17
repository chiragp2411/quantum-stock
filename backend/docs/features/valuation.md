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

### Why Forward EPS = Current EPS × (1 + Growth%)

This is the core formula that projects next year's earnings per share from the current EPS and a growth rate. The formula works directly when the growth rate represents **PAT/EPS growth** — the growth rate IS how much EPS will increase.

**When Revenue Growth is used as proxy:**

If PAT growth guidance is unavailable, the system falls back to revenue growth. Applying revenue growth directly to EPS via `Forward EPS = Current EPS × (1 + Revenue Growth%)` makes an **implicit assumption: net profit margins stay constant**. This means:

- If current PAT margin is 7.5% and revenue grows 67%, the formula assumes PAT also grows 67% (margin stays at 7.5%)
- In reality: if margins expand (7.5% → 10%), EPS growth > revenue growth; if margins compress (7.5% → 5%), EPS growth < revenue growth

**Why this tradeoff exists:**

1. Revenue growth guidance is available far more often than direct PAT growth guidance
2. Applying it with the constant-margin assumption gives a useful baseline estimate
3. The system explicitly warns users when this proxy is used, shows the current PAT margin, and invites them to override

**When the system CAN be smarter (Strategy 3):**

If both revenue guidance AND margin guidance exist, the system uses Strategy 3 to calculate a **margin-adjusted** growth rate: `Forward PAT = Forward Revenue × Forward Margin`, then computes actual PAT growth. This avoids the constant-margin assumption entirely.

**What the frontend shows:**

- Growth type label clearly indicates the source: "PAT Growth (direct)" vs "Revenue Growth → applied as EPS growth (constant margins at X%)"
- A prominent amber warning banner explains the margin assumption
- Full calculation breakdown shows every formula and step
- Users can always override the growth rate manually

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

### What Forward Data Is Extracted — 7-Strategy Waterfall

The system uses a comprehensive waterfall of 7 strategies to find the best growth rate, ensuring real management guidance is NEVER missed:

| Priority | Strategy | What It Looks For | Example |
|----------|---------|-------------------|---------|
| 1 | Structured growth % | `pat_growth`, `ebitda_growth`, `earnings_cagr`, `revenue_growth` with `unit=pct` in `structured_guidance` | "25-30% PAT growth" → 30% |
| 2 | Implied growth from absolute FY targets | Two consecutive FY targets for `pat` or `revenue` (unit=cr), calculates YoY growth or CAGR | Revenue FY26=₹6100cr, FY27=₹8100cr → 32.8% |
| 3 | Derived PAT from (Revenue × PAT margin) | Forward revenue + forward PAT margin guidance → calculate forward PAT → compare with trailing PAT | Rev ₹8100cr × 4.25% margin = ₹344cr PAT vs trailing ₹200cr → 72% |
| 4 | Legacy guidance dict (broad search) | Searches all keys containing `growth`, `cagr`, `pat`, `revenue` | Legacy key `revenue_CAGR_FY26-30: 30-35%` → 35% |
| 5 | Historical growth (this concall) | `pat_growth_yoy_pct` or `revenue_growth_yoy_pct` from the analysis | Reported PAT growth 82% YoY |
| 6 | Historical growth (previous concalls) | Same fields from prior 1-3 concalls | Q2FY26 PAT growth 82% |
| 7 | Default 20% | Absolute last resort — all 6 strategies found nothing | "Defaults to 20%. Override with your research." |

### Handling Missing Guidance

| Situation | What Happens | User Sees |
|-----------|-------------|-----------|
| Direct PAT growth % in guidance | Strategy 1: uses directly | "PAT Growth (management guidance): 30%" |
| Absolute PAT/Revenue FY targets | Strategy 2: calculates implied growth | "Implied Revenue Growth (FY26→FY27): 32.8%" with calculation shown |
| Revenue + PAT margin guidance | Strategy 3: derives forward PAT | "Derived PAT Growth (Revenue × Margin guidance)" with full formula |
| Only legacy CAGR keys | Strategy 4: parses from legacy dict | "Revenue Growth (legacy guidance): 30-35%" |
| Only historical data | Strategy 5-6: uses backward-looking growth | Warning: "Using historical PAT growth, not forward guidance" |
| Nothing across all concalls | Strategy 7: defaults to 20% | Warning: "No guidance found — defaults to 20%. Override." |
| No concalls analyzed | Returns null | Large prompt to upload con-calls |
| User overrides slider | Uses user's value | Shows both: guidance was X%, you set Y% |

## Multi-Year Forward Valuation

### How Forward Period Is Determined

The valuation targets a single forward fiscal year determined by the latest concall quarter:

| Concall Quarter | Forward Period | Reasoning |
|----------------|---------------|-----------|
| Q1FY26, Q2FY26, Q3FY26 | **FY26** | Guidance from within FY26 targets the current fiscal year |
| Q4FY26 | **FY27** | Q4 results come at FY end, so guidance is for the next year |

### "Management gave guidance for FY27 but system shows FY26?"

This is by design. The system extracts the best growth rate from ALL guidance data (including FY27 targets) and applies it to current trailing EPS. The growth rate itself can come from comparing FY26→FY27 absolute targets, even though the valuation label says "FY26".

### Saving vs Experimenting

**Slider changes are local previews** — the scenario table updates instantly in the browser using client-side math so you can experiment freely. Nothing is saved to the database until you explicitly click **"Save & Calculate Valuation"**. This ensures the dashboard's "Bargain Opportunities" count only reflects intentionally saved valuations.

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
  "growth_type": "pat_direct",
  "current_pat_margin": 16.7,
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
1.  User opens valuation page
2.  Frontend calls GET /guidance-prefill + GET /latest in parallel
3.  Backend finds latest concall by fiscal quarter (not upload order)
4.  Extracts growth rate from guidance fields (7-strategy waterfall)
5.  Returns full transparency: source, raw value, assumptions, forward period
6.  Frontend shows saved valuation from DB (if any) + prefill data
7.  User adjusts sliders → preview recalculated locally (no API call)
8.  User clicks "Save & Calculate" → POST /calculate
9.  Backend fetches live EPS/price, calculates scenarios, determines phase
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
