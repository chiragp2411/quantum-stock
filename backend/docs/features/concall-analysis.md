# Feature: Con-Call Analysis Pipeline

## Overview

The con-call analysis feature allows users to upload earnings conference call transcripts (PDFs) and run AI-powered analysis. The primary analyzer is **Google Gemini 2.5 Flash** with structured JSON output. Ollama + SpaCy serves as a fallback when Gemini is unavailable.

## Architecture

### Pipeline Flow

```
PDF Upload → GridFS Storage → pdfplumber Text Extraction →
Gemini Structured Analysis (single API call, ~15-30s) →
ConCallAnalysis (30+ fields) → MongoDB
```

### Fallback Pipeline (when ANALYSIS_PROVIDER=ollama)

```
PDF Upload → GridFS Storage → pdfplumber Text Extraction →
SpaCy + regex extraction (structured data, <2s) →
Ollama summary generation (~25s) →
ConCallAnalysis → MongoDB
```

## Storage

- **PDF binary**: Stored in MongoDB GridFS (`fs.files` + `fs.chunks`) — full PDF preserved for re-download/re-analysis
- **Extracted text**: Stored in `concalls.raw_text` field
- **Analysis result**: Stored in `concalls.analysis` as embedded document with 30+ fields
- **Status tracking**: `concalls.status` field tracks lifecycle: `pending` → `queued` → `analyzing` → `completed`/`failed`

## Gemini Integration

- **Model**: `gemini-2.5-flash` (configurable via `GEMINI_MODEL`)
- **Input**: Full transcript text with context (symbol, sector, quarter hint, previous quarter analysis)
- **Output**: Structured JSON matching `_GeminiAnalysisSchema` (30+ fields)
- **Temperature**: 0.15 (deterministic, high accuracy)
- **Max output tokens**: 16,384
- **Cross-quarter context**: Previous quarter's analysis passed as compact JSON for contradiction detection

### Token Optimization

- Single API call per concall (not multiple chained calls)
- Structured output mode forces exact schema — no wasted tokens on filler
- Previous quarter context is a compact subset (~500 bytes), not full analysis
- Analysis stored in DB — subsequent page views never trigger LLM calls
- Re-analysis is explicitly user-triggered (requires auth)

## Output Schema (ConCallAnalysis — 30+ fields)

### Core Analysis

| Field | Type | Description |
|-------|------|-------------|
| `quarter` | str | Fiscal quarter e.g. "Q3FY26" |
| `detailed_summary` | str | 1500-3000 word professional concall summary in markdown |
| `highlights` | list[str] | 8-12 key quantitative takeaways |
| `tone_score` | int (1-10) | Management confidence/transparency score |
| `guidance` | dict[str, str] | Forward guidance by metric: revenue_growth, pat_growth, capex, etc. |
| `green_flags` | list[str] | Positive investment signals |
| `red_flags` | list[str] | Warning signals and risks |
| `management_execution_score` | int (1-10) | Track record of delivering on promises |
| `key_quotes` | list[str] | Direct management quotes with numbers |
| `lynch_category` | str | Growth classification |

### Business Intelligence

| Field | Type | Description |
|-------|------|-------------|
| `business_model` | str | Products, customers, revenue model |
| `moat_signals` | list[str] | Competitive advantages identified |
| `competitive_advantages` | list[str] | Specific moat factors |

### Financial Extraction

| Field | Type | Description |
|-------|------|-------------|
| `revenue_cr` | float | Revenue in ₹ crores |
| `ebitda_cr` | float | EBITDA in ₹ crores |
| `pat_cr` | float | PAT in ₹ crores |
| `ebitda_margin_pct` | float | EBITDA margin % |
| `pat_margin_pct` | float | PAT margin % |
| `revenue_growth_yoy_pct` | float | Revenue YoY growth % |
| `pat_growth_yoy_pct` | float | PAT YoY growth % |

### Guidance & Trajectory

| Field | Type | Description |
|-------|------|-------------|
| `prev_guidance_comparison` | dict | Comparison with previous quarter's guidance |
| `guidance_trajectory` | str | "up" / "down" / "flat" — direction of guidance revisions |
| `guidance_trajectory_detail` | str | Explanation of trajectory direction |
| `contradictions` | list[str] | Statements contradicting previous quarter |

### Capex & Expansion

| Field | Type | Description |
|-------|------|-------------|
| `capex_plans` | list[str] | Capital expenditure plans with amounts and timelines |
| `capacity_utilization` | str | Current capacity utilization |
| `geographic_expansion` | list[str] | Geographic expansion plans |

### Investment Thesis

| Field | Type | Description |
|-------|------|-------------|
| `investment_thesis` | list[str] | 3-point buy/hold/sell thesis |
| `sector_best_pick_rationale` | str | Why this stock vs peers |

## Structured Guidance Extraction

### GuidanceItem Schema

Every forward-looking statement is extracted as a structured `GuidanceItem`:

| Field | Type | Description |
|-------|------|-------------|
| `metric` | str | Standardized key: revenue_growth, pat_growth, ebitda, ebitda_margin, capex, store_count, etc. |
| `metric_label` | str | Human-readable: "Revenue Growth", "PAT" |
| `period` | str | Target period: "FY27", "Q4FY26", "long_term" |
| `value_text` | str | Raw management language: "₹350 cr+", "high teens" |
| `value_low` | float | Parsed numeric lower bound |
| `value_high` | float | Parsed numeric upper bound |
| `unit` | str | "pct", "cr", "tons", "stores", "days" |
| `guidance_type` | str | explicit_numeric, vague_range, qualitative, conditional, continued, implicit_confirmation, withdrawn |
| `revision` | str | new, raised, maintained, lowered, withdrawn, unknown |
| `revision_detail` | str | "Raised from 25% to 30%" |
| `evidence_quote` | str | Exact management quote supporting this |
| `confidence` | float | 0-1 extraction confidence |
| `conditions` | str | "if monsoon is normal" |
| `segment` | str | Business segment if applicable |

### 15 Guidance Cases Handled

| # | Case | guidance_type | How Handled |
|---|------|--------------|-------------|
| 1 | Explicit numeric ("20-25% growth") | explicit_numeric | Direct extraction: value_low=20, value_high=25 |
| 2 | No new guidance ("on track with earlier") | continued | Copy previous values, revision=maintained |
| 3 | Raised/lowered ("now 30% vs 25%") | explicit_numeric | revision=raised/lowered, revision_detail shows old vs new |
| 4 | Vague range ("high teens") | vague_range | Mapped: high teens → 15-19% |
| 5 | Qualitative only ("robust demand") | qualitative | value_text captures language, no numeric values |
| 6 | Conditional ("15-20% if monsoon normal") | conditional | conditions field populated, values still extracted |
| 7 | Implicit confirmation ("Is 25% ok?" "Yes") | implicit_confirmation | evidence_quote captures Q&A exchange |
| 8 | Segment-wise ("Retail 25%, Mfg 15%") | explicit_numeric | Separate items per segment with segment field |
| 9 | Historical continuation ("long-term 25% CAGR") | continued | period=long_term |
| 10 | Language shift (cautious but no number change) | continued | revision=maintained, revision_detail notes shift |
| 11 | Withdrawal ("no guidance due to uncertainty") | withdrawn | revision=withdrawn, no values |
| 12 | Contradiction ("on track → delayed") | explicit_numeric | Flagged in contradictions + revision_detail |
| 13 | Time-bound without % ("double in 3 years") | explicit_numeric | Converted to CAGR (~26%) |
| 14 | Change in focus (revenue → margin focus) | varies | New items for new metrics only |
| 15 | Combination of above | varies | Multiple GuidanceItem entries, each typed correctly |

### Vague Language Mapping

| Expression | Numeric Range |
|-----------|--------------|
| "high teens" | 15-19% |
| "mid-teens" | 14-16% |
| "low teens" | 11-13% |
| "low double digits" | 10-13% |
| "strong double-digit" | 15-25% |
| "mid-to-high teens" | 14-19% |
| "low-20s" | 20-23% |
| "upper/high single digits" | 7-9% |
| "mid single digits" | 4-6% |
| "double in 3 years" | ~26% CAGR |

### Standardized Metric Taxonomy

Metrics grouped into categories for display:

**Growth**: revenue_growth, pat_growth, ebitda_growth, volume_growth, earnings_cagr, sssg
**Profitability**: revenue, ebitda, pat, ebitda_margin, pat_margin, gross_margin, roce, roe
**Operations**: capex, store_count, volume, capacity, capacity_utilization, order_book, market_share, working_capital_days

## Guidance Tracker

The tracker builds a quarter-over-quarter view of management's guidance vs actuals.

### How It Works

1. Each analyzed concall has `structured_guidance` (new) and `guidance` (legacy fallback)
2. The tracker endpoint iterates concalls chronologically
3. For each quarter: previous quarter's guidance becomes this quarter's `structured_prev_guidance`
4. Current quarter's structured items become `structured_new_guidance`
5. Items are grouped by category (Growth / Profitability / Operations)
6. Each item shows its revision status (new / raised / maintained / lowered / withdrawn)
7. Evidence quotes available on hover for every guidance item

### Backward Compatibility

- Old concalls with only `guidance: dict[str, str]` still render as legacy chips
- New concalls produce `structured_guidance: list[GuidanceItem]` for categorized display
- Tracker shows structured data when available, falls back to legacy format

### Management Credibility Score

- Calculated from guidance hit-rate across all tracked quarters
- Formula: `(quarters_met + 0.5 * quarters_partial) / total_tracked * 100`
- Categories: High (≥80%), Medium (50-79%), Low (<50%)

### Financial Time-Series

- Extracts quarter-over-quarter KPIs from all analyzed concalls
- Fields: revenue_cr, ebitda_cr, pat_cr, margins, growth rates, tone/execution scores
- Used for Financial Performance charts on the concalls page

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/{symbol}/upload` | Yes | Upload PDF transcripts (1-8 files) |
| POST | `/{symbol}/analyze` | Yes | Queue pending concalls for analysis |
| POST | `/{symbol}/reanalyze/{id}` | Yes | Re-run single analysis |
| DELETE | `/{symbol}/clear?filter_status=` | Yes | Bulk delete (failed/pending/all) |
| DELETE | `/{symbol}/{id}` | Yes | Delete single concall |
| GET | `/{symbol}` | No | List all concalls |
| GET | `/{symbol}/tracker` | No | Guidance tracker + credibility + financials |
| PUT | `/{symbol}/{id}/override` | Yes | Manual override actuals |

## Background Processing

- Sequential worker thread: one concall at a time via `queue.Queue`
- Prevents Gemini API contention from parallel requests
- Frontend polls every 4 seconds for status updates
- Startup cleanup resets stuck `analyzing`/`queued` → `pending`

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `concalls/page.tsx` | Main page: upload, analyze, view results |
| `analysis-card.tsx` | Per-concall card: status, KPI chips, trajectory, thesis preview |
| `analysis-drawer.tsx` | 7-tab detailed view: Summary, Guidance, Business, Thesis, Flags, Capex, Quotes |
| `tracker-table.tsx` | Guidance tracker with Met/Missed, trajectory, contradictions |
| `guidance-trend-chart.tsx` | Tone & execution score trend lines |
| `guidance-vs-actuals-chart.tsx` | Visual comparison chart |
| `financial-kpi-chart.tsx` | Revenue/PAT, margins, growth % charts |
| `credibility-badge.tsx` | Management reliability indicator |
| `pdf-dropzone.tsx` | Drag-and-drop PDF upload zone |

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/concalls/gemini_analyzer.py` | Gemini structured analysis (primary) |
| `backend/app/concalls/llm_analyzer.py` | SpaCy + Ollama analysis (fallback) |
| `backend/app/concalls/spacy_preprocessor.py` | SpaCy NER for financial entities |
| `backend/app/concalls/pdf_parser.py` | pdfplumber text extraction |
| `backend/app/concalls/models.py` | ConCallAnalysis, GuidanceRow, ManualOverride |
| `backend/app/concalls/router.py` | API endpoints and background worker |
