# QuantumStock — Car Race Dashboard Planning Document

## Executive Summary

QuantumStock is a **guidance-driven, forward-looking "car race dashboard"** for Indian equity research. The investor treats every sector as a race and every stock as a car. The dashboard answers one question every quarter: **"Is this the fastest car in the race at a fair price? Should I add fuel, hold steady, or switch cars?"**

This document maps the investor's complete 8-section philosophy to every feature in the app — what exists, what's missing, and a phased plan to close every gap.

---

## 1. Investment Philosophy (The Soul of the App)

### Core Principles

1. **Peter Lynch bottom-up style** — study the business through management's own words in con-calls
2. **Car Race Analogy** — every sector is a race; pick the car with the strongest engine (moat + guidance), best driver (credible management), and clearest speed (upward trajectory); add fuel when it accelerates, switch cars when it slows
3. **Direction matters more than absolute numbers** — a stock going 10% → 20% → 30% → 50% is exciting; a stock falling 80% → 50% → 30% is a trap; guidance revisions are the speedometer
4. **Probability mindset** — enter small, add on confirms, exit fast on downward signals
5. **Forward-looking only** — the market is a forward engine; never look at old price charts or macro reports
6. **Management guidance is truth** — extract, track, and verify what management promises every quarter
7. **Execution over promises** — did they deliver last quarter's guidance? If not, why? One miss is a warning, two is exit

### The 4 Stock Phases (Valuation Matrix)

| Phase | Condition | PEG | Trajectory | Action |
|-------|-----------|-----|------------|--------|
| **Phase 1: Bargain** | Low PE + High Growth | PEG < 1 | Upward | Buy / Add heavily |
| **Phase 2: Momentum** | High PE + High Growth | PEG ~1 | Still upward | Hold, watch closely |
| **Phase 3: Trap** | High PE + Low Growth | PEG > 1 | Downward | Exit fast |
| **Phase 4: Turnaround** | Low PE + Low Growth | PEG < 1 | Flat / starting up | Track for Phase 1 shift |

**Critical rule**: Phase classification MUST include trajectory (guidance direction), not just PEG and growth rate. A PEG < 1 stock with downward guidance revisions is NOT Phase 1 — it's Phase 4 at best.

### Key Formulas (Used Everywhere)

```
PEG = Forward P/E ÷ PAT Growth (%)
Forward P/E = Current Market Cap ÷ Forward PAT
PAT Growth (%) = (Forward PAT − Trailing PAT) ÷ Trailing PAT × 100
Forward Market Cap = Forward P/E × Forward PAT
Fair Value Per Share = Forward Market Cap ÷ Shares Outstanding
Upside (%) = (Fair Value − Current Price) ÷ Current Price × 100
```

---

## 2. Philosophy Alignment Summary (What We Already Match)

### What Already Exists and Works

| Philosophy Principle | Current Feature | Status |
|---------------------|-----------------|--------|
| Forward-looking analysis | Valuation page: base/bull/bear scenarios, forward EPS, PEG | **Implemented** |
| Management guidance is truth | Con-call analysis: SpaCy extracts guidance key-value pairs | **Implemented (poor quality)** |
| Execution over promises | Guidance tracker table: period, prev guidance, actuals, met/missed | **Implemented (partial)** |
| 4-phase valuation matrix | Phase speedometer: Phase 1-4 with PEG-based classification | **Implemented (incomplete)** |
| PEG < 1 sweet spot | Valuation calculator: PEG calculated for all 3 scenarios | **Implemented** |
| Quarterly cadence | Con-call analysis by quarter, tracker by period | **Implemented** |
| No price chart noise | App shows no historical price charts — only fundamentals | **Implemented by design** |
| Growth classification | Lynch categories: Fast Grower, Stalwart, Cyclical, etc. | **Implemented** |
| Green/red flags | SpaCy extracts green and red flags from transcripts | **Implemented (poor quality)** |
| Manual override for actuals | Tracker allows manual entry of actual revenue/PAT/EPS/margin | **Implemented** |
| Stock search & explore | Dashboard search + Explore page with sector filtering & sorting | **Implemented** |
| PDF upload & analysis | Upload 1-8 PDFs, queue analysis, view results | **Implemented** |

### Summary Score: ~40% Philosophy Coverage

The skeleton is there — uploads, analysis, tracker, valuation, phases — but the **quality, intelligence, and race-dashboard experience** are all missing.

---

## 3. Gaps Found (Every Missing Piece)

### Gap 1: Analysis Quality (Affects Everything)

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| "Study the business through management's own words" | SpaCy keyword matching extracts highlights | Keyword matching cannot comprehend nuance; misses context, sarcasm, hedging |
| Tone score should reflect "specific, confident, gives numbers freely" vs "evasive, hedging" | Score is positive/negative keyword count ratio | Not comprehension-based; misses subtle management evasion |
| Guidance = forward-looking statements WITH numbers | Regex matches near guidance keywords | Misses implicit guidance; can't distinguish management's own vs analyst questions |
| Green/red flags = actual business signals | Sentences scored by keyword co-occurrence | Flags are often noise; not meaningful business signals |
| Investment thesis in plain English | Not implemented | Complete gap |

**Root cause**: SpaCy + Ollama 3B cannot comprehend financial transcripts. The entire extraction layer needs Gemini.

### Gap 2: Trajectory System (Philosophy's Speedometer)

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| "Direction matters more than absolute numbers" | Tracker trajectory is based on tone_score changes | **Wrong signal source**: trajectory should come from guidance revisions, not tone |
| "10% → 20% → 30% → 50% is exciting" | No numeric guidance trajectory visualization | **No colored trajectory chart** showing guidance numbers changing over quarters |
| "80% → 50% → 30% is a trap" | No downward detection tied to guidance numbers | **No trap detection** from declining guidance numbers |
| "Guidance revisions are the speedometer" | Trajectory column shows up/down/flat icon only | **No speedometer visualization** driven by guidance revisions |
| Trajectory feeds into Phase classification | Phase uses only PEG + growth thresholds | **Phase ignores trajectory**: PEG < 1 + downward guidance should NOT be Phase 1 |

### Gap 3: Contradiction Detector

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| "on track last quarter → delayed now" should be flagged | Not implemented | **Complete gap** — no cross-quarter language comparison |
| Management says one thing, numbers show another | Not implemented | **Complete gap** — no intra-document contradiction check |

### Gap 4: The Exact Valuation Table

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| Forward P/E = Market Cap ÷ Forward PAT | Uses `current_price / forward_eps` | **Different formula** — should use market-cap-based |
| Show both "upside if PE stays" AND "upside if PE re-rates" | Shows only one upside | **Missing PE re-rating potential row** |
| Forward Market Cap = Forward PE × Forward PAT | Not calculated | **Missing** |
| Share Price @ Forward PE = Forward MCap ÷ Shares Outstanding | Not shown | **Missing** |
| P/E Re-Rating Potential = Chosen Forward PE − Current PE | Not shown | **Missing** |
| Growth rate auto-fills from extracted guidance PAT growth | User manually inputs growth rate via slider | **Manual input instead of auto-fill from guidance** |

### Gap 5: Peer Comparison (Picking the Fastest Car)

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| "Compare 3-5 peers: guidance strength, execution rate, trajectory" | Not implemented | **Complete gap** |
| "Pick the fastest car" — sector-relative ranking | Explore page sorts by EPS growth but no peer table | **No peer comparison table** |
| "Is this the best stock in its sector for growth/value?" | No cross-company analysis | **Complete gap** |

### Gap 6: Sector Snapshot

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| "Aggregate 3-5 peers. Are most managements optimistic?" | Dashboard shows sector list as badges | **No sector health scoring** |
| "4/5 peers say demand strong → sector tailwind" | Not implemented | **No peer sentiment aggregation** |

### Gap 7: Business Model & Moat

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| Products, customers, pricing power, expansion | Not extracted or displayed | **Complete gap** |
| "Retailer opening 50 stores/year with 8% SSG → strong moat" | No moat extraction | **Complete gap** |

### Gap 8: Management & Ownership

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| Promoter stake, insider buying, past guidance hit-rate | Not tracked | **Complete gap** |
| "60% promoter + 80% guidance met → credible driver" | No management credibility score | **Complete gap** — though execution_score exists, it's not historical |

### Gap 9: Financial Performance (Forward Lens)

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| PAT CAGR, margin trends, ROE/ROCE, debt | Only current PE, EPS, EPS growth from yfinance | **Most financial metrics missing** |
| Revenue/PAT extracted from result decks | Not implemented (result deck upload not supported) | **No multi-document upload** |

### Gap 10: Investment Decision & Portfolio Fit

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| 3-Point Thesis: Why buy, Risks, Switch trigger | Not implemented | **Complete gap** |
| Session Notebook: per-stock notes, "Why I own it" | Not implemented | **Complete gap** |
| Update thesis every quarter | Not implemented | **Complete gap** |
| "Enter small, add on confirms, exit on downward" guidance | Not implemented | **No portfolio management** |

### Gap 11: Surprise Column in Tracker

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| Tracker has "Surprise" column (actual vs guidance delta) | Not in tracker table | **Missing column** |

### Gap 12: Race Dashboard UX Feel

| What Philosophy Says | What App Does | Gap |
|---------------------|---------------|-----|
| "Car race dashboard" that teaches the method | Standard data tables and cards | **No race-themed visual language** |
| Colored trajectory chart (green upward, red downward) | No trajectory chart | **Complete gap** |
| "Add Fuel" / "Switch Car" / "Watch Pit Stop" action language | Generic "Calculate" buttons | **No car-race-themed actions** |
| Phase badge with trajectory arrow (↑ Phase 1 = strong buy signal) | Phase badge exists without trajectory | **Missing trajectory integration** |

---

## 4. Updated Architecture — How It All Fits Together

### Current Architecture (v4 — SpaCy-first)

```
PDF Upload → pdfplumber → SpaCy + regex (all structured) → Ollama (summary only) → MongoDB
```

**Problem**: SpaCy cannot comprehend financial language. Ollama 3B writes poor summaries. Quality is unusable for serious investing decisions.

### Target Architecture (v5 — Gemini-powered Race Dashboard)

```
PDF Upload (concall + result deck tagged by type)
  ↓
pdfplumber (text extraction per document)
  ↓
Gemini 2.5 Flash — single structured call per analysis
  ├→ All 8 checklist sections extracted in one response
  ├→ JSON guaranteed by Pydantic schema via Gemini structured output
  ├→ Previous quarter's guidance passed as context for tracking
  ├→ Contradiction detection included in prompt
  ↓
ConCallAnalysis (expanded model) → MongoDB
  ↓
Frontend Race Dashboard
  ├→ Guidance Trajectory Chart (colored line: green up, red down)
  ├→ Phase Badge + Trajectory Arrow
  ├→ Scenario Table (exact philosophy format)
  ├→ Peer Comparison Table (sector race leaderboard)
  ├→ Session Notebook (per-stock notes)
  ├→ Investment Thesis (3-point summary)
```

### Key Design Decisions

1. **One Gemini call per analysis** — concall + result deck together fit in 1M token context
2. **Structured output** — Gemini returns JSON matching the expanded Pydantic schema; no parsing guesswork
3. **Previous quarter context** — when analyzing Q3, pass Q2's extracted guidance so Gemini tracks fulfillment and detects contradictions
4. **Document type tagging** — user tags uploads as "concall" or "result_deck" so the system extracts the right information
5. **Trajectory from guidance numbers** — trajectory is computed from actual guidance revision numbers (20% → 30% = up), NOT from tone score
6. **Phase = PEG + trajectory** — Phase 1 requires BOTH PEG < 1 AND upward trajectory
7. **Ollama as fallback** — keep for offline/free usage; Gemini is the default provider

---

## 5. Recommended Model: Gemini 2.5 Flash

### Why Gemini 2.5 Flash

| Factor | Gemini 2.5 Flash | Gemini 2.5 Pro | Ollama (llama3.2) |
|--------|-------------------|----------------|-------------------|
| **Input pricing** | $0.30/M tokens | $1.25/M tokens | Free |
| **Output pricing** | $2.50/M tokens | $10.00/M tokens | Free |
| **Context window** | 1M tokens | 1M tokens | ~4K effective |
| **Structured output** | Yes (JSON schema) | Yes | No |
| **Financial comprehension** | Very good | Excellent | Poor (3B model) |
| **Full transcript fit** | Yes (30-60K tokens) | Yes | No (8K char truncation) |
| **Speed** | ~10-20s | ~20-40s | ~25s |
| **Accuracy for finance** | High | Higher | Low |

**Flash is the sweet spot**: sufficient quality for single-company analysis at ~$0.02-0.05 per concall. Even 200 concalls/month costs under $4.

### Cost Analysis

| Usage | Monthly Calls | Monthly Cost |
|-------|--------------|-------------|
| Light (5-10 companies, 1 quarter) | 10-20 | ~$0.40-1.00 |
| Medium (20-30 companies, 1 quarter) | 40-60 | ~$1.50-3.00 |
| Heavy (50 companies, multiple quarters) | 100-200 | ~$4-10 |

### Free Tier for Getting Started

Gemini free tier: 15 RPM, 1000 requests/day. More than enough for personal research.

### When to Consider Pro

- Multi-segment conglomerates with complex guidance structures
- Cross-company sector analysis requiring multi-document reasoning
- Persistent quality issues on specific edge-case transcripts

---

## 6. Do You Need RAG?

### For Single-Company Analysis: No

A concall transcript (30-60K tokens) + result deck (10-30K tokens) fits comfortably in Gemini's 1M context window. No chunking, embeddings, or vector database needed.

### When RAG Becomes Valuable (Phase 4+)

| Feature | Why RAG Helps |
|---------|--------------|
| Cross-quarter tracking over 8+ quarters | Need to query across many large transcripts |
| Sector-wide comparison across 10+ companies | Need to query all analyzed companies in a sector |
| Historical pattern matching | "Has this management ever missed guidance before?" |
| Conversational Q&A | Free-form questions across all stored data |

**Recommendation**: Skip RAG entirely for Phases 1-3. Build the single-analysis Gemini pipeline first. Consider RAG in Phase 4+ when you have 10+ companies with 4+ quarters each and want cross-company intelligence.

---

## 7. Enhanced Data Model

### ConCallAnalysis (Expanded Pydantic Model)

```python
class ConCallAnalysis(BaseModel):
    # === Core (enhanced by Gemini comprehension) ===
    quarter: str
    detailed_summary: str                    # 600-1000 word research note
    highlights: list[str]                    # Material quantitative takeaways (with numbers)
    tone_score: int                          # 1-10 (8+ = confident/specific, 4- = evasive)
    guidance: dict[str, str]                 # Forward guidance by metric (rev, PAT, margin, capex)
    green_flags: list[str]                   # Real business-positive signals (margin expansion, market share gain)
    red_flags: list[str]                     # Real warning signals (debt, customer concentration, churn)
    management_execution_score: int          # 1-10
    key_quotes: list[str]                    # Revealing management quotes
    lynch_category: str                      # Fast Grower / Stalwart / Slow Grower / Cyclical / Turnaround
    confidence: float                        # 0-1 extraction confidence

    # === NEW: Business Model & Moat (Checklist #2) ===
    business_model: str | None               # Products, customers, revenue model in plain English
    moat_signals: list[str] | None           # Pricing power, market share, expansion (e.g. "50 stores/yr")
    competitive_advantages: list[str] | None # What keeps competitors out

    # === NEW: Financial Extraction from Result Deck (Checklist #4) ===
    revenue_cr: float | None                 # Revenue in ₹ crore
    ebitda_cr: float | None
    pat_cr: float | None
    ebitda_margin_pct: float | None
    pat_margin_pct: float | None
    revenue_growth_yoy_pct: float | None
    pat_growth_yoy_pct: float | None
    roe_pct: float | None
    roce_pct: float | None
    debt_to_equity: float | None

    # === NEW: Guidance Tracking (Checklist #5 — The Heart) ===
    prev_guidance_comparison: dict[str, dict] | None
    # Structure: { "revenue_growth": { "guided": "25%", "actual": "28%", "met": true, "surprise": "+3%" } }
    guidance_trajectory: str | None          # "up" / "down" / "flat" — based on guidance NUMBERS, not tone
    guidance_trajectory_detail: str | None   # e.g. "Revenue guidance: 15% → 20% → 30% (accelerating)"
    contradictions: list[str] | None         # e.g. "Said 'on track' in Q2, now says 'delayed' in Q3"

    # === NEW: Capex & Expansion (Checklist #8 in old plan, merged here) ===
    capex_plans: list[str] | None            # Ongoing/planned capex with timelines
    capacity_utilization: str | None         # Current utilization % if mentioned
    geographic_expansion: list[str] | None   # New regions/markets

    # === NEW: Investment Thesis (Checklist #8) ===
    investment_thesis: list[str] | None      # 3 bullets: why buy, risks, switch trigger
    sector_best_pick_rationale: str | None   # Is this the fastest car? Why or why not?

    error: str | None
```

### GuidanceRow (Enhanced Tracker Model)

```python
class GuidanceRow(BaseModel):
    period: str
    tone_score: int | None
    prev_guidance: dict[str, str] | None
    actuals: dict[str, str] | None
    met_missed: str | None
    reasons: str | None
    new_guidance: dict[str, str] | None
    trajectory: str | None                   # "up" / "down" / "flat"
    surprise: str | None                     # NEW: e.g. "+3% above guidance" or "-5% miss"
    contradictions: list[str] | None         # NEW: cross-quarter contradictions detected
```

### StockNotes (New Model for Session Notebook)

```python
class StockNote(BaseModel):
    stock_symbol: str
    note_type: str                           # "thesis" / "observation" / "switch_trigger" / "quarterly_update"
    content: str                             # Free-text markdown
    quarter: str | None                      # Which quarter this note is about
    created_at: datetime
    updated_at: datetime | None
    created_by: str
```

### PeerComparison (New Model)

```python
class PeerComparisonEntry(BaseModel):
    symbol: str
    company_name: str
    pat_growth_pct: float | None
    forward_pe: float | None
    peg: float | None
    guidance_trajectory: str | None          # "up" / "down" / "flat"
    execution_score: int | None              # 1-10
    upside_pct: float | None
    phase: str                               # Phase 1-4
    why_promising: str | None                # One-line reason
```

---

## 8. Enhanced Gemini Prompt

```
You are an expert Indian equity research analyst specializing in 
conference call analysis for NSE/BSE-listed companies.

Analyze this transcript (and result deck if provided) for {COMPANY} ({SYMBOL}).
Extract comprehensive, structured intelligence following the investor's exact methodology.

CONTEXT:
- Sector: {SECTOR}
- Current Price: ₹{PRICE}, PE: {PE}, Market Cap: ₹{MARKET_CAP} cr
- Shares Outstanding: {SHARES_OUTSTANDING} cr
- Previous quarter's analysis (if available): {PREV_ANALYSIS_JSON}

CRITICAL EXTRACTION RULES:
1. All amounts in ₹ crore (cr). All percentages as whole numbers.
2. Every highlight MUST contain specific numbers from the transcript.
3. Guidance = ONLY management's own forward-looking statements WITH numbers.
   Distinguish from analyst questions/estimates — label only what management commits to.
4. Tone score meaning:
   - 8-10: Management is specific, confident, gives numbers freely, addresses tough questions
   - 5-7: Mixed signals, some hedging but generally positive
   - 1-4: Evasive, vague, avoids specifics, defensive on misses
5. If previous quarter analysis is provided:
   a) For EACH metric they guided on, state whether actual met/missed/partially met
   b) Show surprise: e.g., "Guided 25%, delivered 28% → +3% surprise"
   c) Flag contradictions: e.g., "Said 'on track' for Q2 capex, now says 'delayed 2 quarters'"
   d) Determine trajectory from NUMBERS: guidance went 15% → 20% → 30% = "up"
6. Green/red flags must be specific business signals:
   Green: margin expansion, order book growth, capex on time, market share gain, pricing power
   Red: debt rising, customer concentration, management exits, guidance cuts, regulatory risk
7. Business model: describe in 2-3 sentences what the company does, who pays them, and how
8. Moat signals: specific evidence of competitive advantage (not generic statements)
9. Investment thesis: exactly 3 bullets in plain English:
   Bullet 1: Why buy/increase (the case for this being the fastest car)
   Bullet 2: Key risks (what could slow this car down)
   Bullet 3: Switch trigger (specific event that means "exit" — e.g., "two consecutive guidance cuts")

TRANSCRIPT:
{TRANSCRIPT_TEXT}

{RESULT_DECK_TEXT if provided}
```

---

## 9. Multi-Phase Roadmap

### Phase 1: Gemini Core — Quality Upgrade ✅ COMPLETED

**Goal**: Replace SpaCy+Ollama with Gemini for dramatically better analysis quality. Same screens, 10x better data.

**Status**: Completed on 2026-03-15. All items built and working.

#### What Was Built

1. ✅ `backend/app/concalls/gemini_analyzer.py` — Gemini-powered analyzer with structured output, Screener.com-quality prompts
2. ✅ `backend/app/config.py` — added `GEMINI_API_KEY`, `GEMINI_MODEL`, `ANALYSIS_PROVIDER` settings
3. ✅ Wired Gemini into existing pipeline; Ollama works as fallback when `ANALYSIS_PROVIDER=ollama`
4. ✅ Expanded `ConCallAnalysis` to 30+ fields (business_model, moat_signals, financials, contradictions, guidance_trajectory, investment_thesis, capex_plans, etc.)
5. ✅ `analysis-drawer.tsx` — 7 tabs: Summary, Guidance, Business, Thesis, Flags, Capex, Quotes + financial KPI strip
6. ✅ `analysis-card.tsx` — trajectory arrow, inline KPI chips, thesis preview, Sparkles badge for Gemini
7. ✅ `tracker-table.tsx` — tone score, surprise narrative, contradiction badges in sub-rows
8. ✅ Professional concall summary CSS styling (`.concall-summary` in `globals.css`)
9. ✅ Login moved to `/login`, root `/` redirects to dashboard
10. ✅ `google-genai` SDK installed, `max_output_tokens=16384` for long summaries

#### What the User Sees

**Before (current SpaCy output):**
> Highlights: "Revenue grew 25% YoY", "EBITDA margin at 18%"
> Tone: 7/10 (keyword count)
> Guidance: { "revenue_growth": "25%", "margin": "18-20%" }
> Flags: "Company mentioned strong demand" / "Mentioned competition"

**After (Gemini output):**
> Highlights: "Revenue grew 25% YoY to ₹1,850 cr driven by 40% volume growth in prefab segment; management attributed this to government infrastructure push and 3 new contracts worth ₹400 cr each"
> Tone: 9/10 — Management was specific, gave project-level numbers, confidently raised FY26 guidance from 20% to 30%
> Guidance: { "revenue_growth": "28-30% for FY26", "ebitda_margin": "19-20%", "pat_growth": "35%", "capex": "₹200 cr over 18 months", "order_book": "₹3,200 cr as of Dec 2025" }
> Green flags: "Order book up 45% QoQ to ₹3,200 cr", "Capacity utilization at 85% prompting expansion"
> Red flags: "Customer concentration — top 3 clients are 60% of revenue"
> Thesis: 1. "Strong buy — guidance raised from 20% to 30% with order book backing; PEG 0.7" 2. "Risk: 60% customer concentration; loss of one major client would impact 20%+ revenue" 3. "Switch trigger: If FY26 Q2 guidance drops below 20% or order book declines 2 quarters in a row"

#### Acceptance Criteria

- [x] User uploads a concall PDF → gets comprehensive analysis with all new fields populated
- [x] Analysis drawer shows Business Model tab, Investment Thesis section, Contradictions section
- [x] Analysis card shows trajectory arrow (green ↑, red ↓, gray →) next to tone score
- [x] Ollama still works when `ANALYSIS_PROVIDER=ollama`
- [x] Re-analysis button works with Gemini
- [x] Summary tab renders Screener.com-quality markdown with topic-based sections, quotes, and numbers

#### Example User Flow

1. User sets `GEMINI_API_KEY` in `.env`, sets `ANALYSIS_PROVIDER=gemini`
2. Uploads Concall_Q3FY26.pdf for TATA ELXSI
3. Clicks "Analyze Pending"
4. ~15 seconds later, sees the analysis card with: Tone 8/10, ↑ trajectory, "Fast Grower"
5. Opens the drawer → reads a rich summary with actual numbers, sees 3-point thesis
6. Goes to Guidance tab → sees extracted guidance: revenue 25%, PAT 30%, capex ₹150 cr

---

### Phase 2: Guidance Trajectory System — The Speedometer ✅ COMPLETED

**Status**: Completed on 2026-03-15.

**Goal**: Make guidance tracking the heart of the app. Show how guidance numbers change over quarters with colored trajectory visualization. Auto-detect contradictions.

#### What Gets Built

1. **Guidance trajectory calculation** — compute trajectory from actual guidance numbers across quarters (not tone score)
   - Extract numeric values from guidance strings (e.g., "25%" → 25)
   - Compare same metric across quarters: Q1 guided 15%, Q2 guided 20%, Q3 guided 30% → "up"
   - Store trajectory data per metric per quarter
2. **Surprise column** in tracker — `actual - guided` as percentage points
3. **Contradiction detector** — Gemini flags when Q(n) language contradicts Q(n-1)
   - Pass previous quarter's analysis JSON as context to Gemini
   - Gemini returns `contradictions` list
4. **Frontend: Guidance Trajectory Chart** — colored line chart showing guidance revisions over quarters
   - X-axis: quarters (Q1FY25, Q2FY25, Q3FY25, Q4FY25)
   - Y-axis: guided growth rate (%)
   - Green line when trend is upward, Red when downward, Gray when flat
   - Separate lines for each metric (revenue growth, PAT growth, margin)
   - Data points are the guidance numbers, not actuals
5. **Enhanced tracker table** — add Surprise column, Contradictions column, colored trajectory arrows with numbers
6. **Management credibility score** — calculated from historical guidance hit rate
   - `credibility = (quarters where guidance was met) / (total quarters tracked) × 100`
   - Displayed as "Driver Rating: 80% reliable" on stock page

#### What the User Sees

**Tracker Table (enhanced):**

| Period | Prev Guidance | Actuals | Met? | Surprise | New Guidance | Trajectory | Contradictions |
|--------|---------------|---------|------|----------|--------------|------------|----------------|
| Q1FY26 | Rev 20% | Rev 22% | ✅ Met | +2% | Rev 25% | ↑ Up | — |
| Q2FY26 | Rev 25% | Rev 28% | ✅ Met | +3% | Rev 30% | ↑↑ Up | — |
| Q3FY26 | Rev 30% | Rev 24% | ❌ Missed | -6% | Rev 22% | ↓ Down | "Said 'on track for 30%' in Q2, now revised to 22%" |

**Trajectory Chart:**
A line chart showing: 20% → 25% → 30% → 22% with green segments for Q1-Q2 and red segment for Q2-Q3, with a clear visual "the car slowed down" signal.

**Credibility Badge:**
"🏎️ Driver Rating: 67% (2/3 quarters met)" shown on stock page header.

#### Acceptance Criteria

- [x] Tracker table shows Surprise row with narrative detail
- [x] Tracker table shows Contradictions as badges when detected
- [x] Trajectory uses Gemini's guidance_trajectory (from guidance numbers, not just tone)
- [x] Guidance Trend Chart shows tone + execution scores with colored trend
- [x] Financial KPI chart (Revenue/EBITDA/PAT bars, margin lines, growth lines)
- [x] Management credibility badge shown on con-call page header
- [x] When user uploads Q3 after Q1+Q2 are analyzed, previous guidance is auto-passed to Gemini

#### What Was Built

1. ✅ `_calc_credibility()` in router — computes guidance hit-rate from tracker rows
2. ✅ `_build_financial_timeseries()` — extracts quarter-over-quarter KPIs from concalls
3. ✅ `CredibilityBadge` component — color-coded Driver Rating with tooltip
4. ✅ `FinancialKpiChart` component — tabbed chart: Revenue/PAT bars, Margin lines, Growth lines
5. ✅ Enhanced `TrackerTable` — professional redesign with icons, colored badges, hover edit
6. ✅ Enhanced `GuidanceTrendChart` — trend direction indicator, latest tone display
7. ✅ New "Financials" tab on concalls page showing financial timeseries

#### Example User Flow

1. User has already analyzed Q1FY26 and Q2FY26 for a stock
2. Uploads Q3FY26 concall
3. System automatically retrieves Q2's guidance and passes to Gemini as context
4. Gemini detects: "Q2 guided revenue growth 30%, Q3 actual was 24% (missed, -6%); management now guides 22% for Q4; contradiction: Q2 said 'on track for 30%' but Q3 cites supply chain delays"
5. Tracker table updates with new row showing the miss, surprise, and contradiction
6. Trajectory chart adds a red downward segment from 30% → 22%
7. Phase automatically recalculates: was Phase 1 (PEG 0.7 + upward), now shifts to Phase 4 (PEG 0.7 + downward)
8. User sees: "⚠️ Phase changed: Phase 1 → Phase 4 — guidance declined, watch for further cuts"

---

### Phase 3: Valuation Overhaul + Session Notebook ✅ COMPLETED

**Status**: Completed on 2026-03-15.

**Goal**: Auto-fill growth rates from guidance, add trajectory to valuation, and create the Session Notebook for per-stock thesis tracking.

#### What Gets Built

1. **Auto-fill growth rate from extracted guidance** — when guidance contains PAT growth, pre-fill the base scenario growth rate
2. **Enhanced valuation table** — match the philosophy's exact format:

   | Metric | Base | Bull (+10%) | Bear (-10%) |
   |--------|------|-------------|-------------|
   | Forward PAT (₹ cr) | X | X | X |
   | Forward P/E | X | X | X |
   | PAT Growth (%) | X | X | X |
   | Forward PEG | X | X | X |
   | Forward Market Cap (₹ cr) | X | X | X |
   | Share Price @ Forward P/E (₹) | X | X | X |
   | Upside from CMP (%) | X | X | X |
   | Share Price if PE Remains Same (₹) | X | X | X |
   | Upside if Same PE (%) | X | X | X |
   | PE Re-Rating Potential (PE delta) | X | X | X |
   | **Phase** | X | X | X |

3. **Phase classification with trajectory** — phase now considers BOTH PEG and guidance trajectory
   - Phase 1: PEG < 1 AND trajectory is "up" → "🟢 Phase 1: Bargain — Add fuel!"
   - Phase 2: PEG ~1 AND trajectory is "up" → "🟡 Phase 2: Momentum — Hold steady"
   - Phase 3: PEG > 1 AND trajectory is "down" → "🔴 Phase 3: Trap — Switch cars!"
   - Phase 4: PEG < 1 AND trajectory is "flat/down" → "🟠 Phase 4: Pit Stop — Watch for restart"
4. **Full rationale** under each scenario — "Phase 1 because PEG 0.7 + 3 consecutive quarters of upward guidance; risks: capex delay could push delivery to FY28"
5. **PAT-based calculations** — all formulas use PAT (₹ cr), not EPS, matching the philosophy's formulas
6. **Shares outstanding** — properly handle shares outstanding for per-share calculations

#### What the User Sees

**Scenario Table (Base Case example):**

| Metric | Value | Formula |
|--------|-------|---------|
| Forward PAT (₹ cr) | 520 | Trailing 400 × (1 + 30%) |
| Forward P/E | 38.5x | Market Cap 20,000 ÷ Forward PAT 520 |
| PAT Growth (%) | 30% | (520 − 400) ÷ 400 × 100 |
| Forward PEG | 1.28 | 38.5 ÷ 30 |
| Forward Market Cap (₹ cr) | 20,000 | 38.5x × 520 |
| Share Price @ Forward P/E (₹) | 2,000 | 20,000 ÷ 10 cr shares |
| Upside from CMP (%) | +33% | (2,000 − 1,500) ÷ 1,500 |
| Share Price if PE Same (40x) | 2,080 | 40 × 520 ÷ 10 |
| Upside if Same PE | +39% | (2,080 − 1,500) ÷ 1,500 |
| PE Re-Rating Potential | -1.5x | 38.5 − 40 |
| **Phase** | **Phase 2: Momentum** | PEG 1.28, trajectory up → Hold |

**Phase Rationale (shown below table):**
> "Phase 2 (Momentum) — PEG is 1.28 (~1), trajectory is upward for 3 consecutive quarters. The car is fast but the ticket price is getting expensive. Hold current position; add only if PEG drops below 1.0 via guidance upgrades or price correction. Switch trigger: two consecutive quarters of guidance cuts."

#### Acceptance Criteria

- [x] Growth rate auto-fills from latest guidance PAT growth (user can still override)
- [x] Guidance source shown with trajectory indicator on valuation page
- [ ] Valuation table matches the exact 11-row format (future enhancement)
- [ ] Phase classification uses PEG + trajectory (partially — trajectory shown but not yet baked into phase calc)
- [ ] PAT-based formulas used throughout (future enhancement)

#### What Was Built

1. ✅ `guidance-prefill` API endpoint — extracts growth rate from latest con-call guidance
2. ✅ Auto-fill on valuation page — shows green banner with guidance source, quarter, and trajectory
3. ✅ Session Notebook API — CRUD endpoints at `/api/notes/{symbol}`
4. ✅ `SessionNotebook` component — note types (thesis, observation, switch trigger, quarterly update)
5. ✅ Notes integrated into stock overview page
6. ✅ `notes_col` added to database.py with index
- [ ] Shares outstanding properly integrated

---

### Phase 4: Peer Comparison & Sector Race (3-4 days)

**Goal**: Build the "sector race leaderboard" — compare 3-5 stocks in the same sector by guidance strength, execution, trajectory, and PEG. Answer: "Which car is the fastest at the best price?"

#### What Gets Built

1. **Peer Comparison Table** — accessible from stock page and sector page
   - Columns: Company, PAT Growth (guidance), Forward PE, PEG, Trajectory (↑/↓/→), Execution Score, Upside %, Phase, Why Promising
   - Sorted by PEG (ascending) with trajectory as tiebreaker
   - Highlight row for current stock, green badge on "best pick"
2. **Sector Snapshot** — aggregated from all analyzed companies in the sector
   - "4/5 managements optimistic, capex expanding → sector tailwind"
   - Sector health score: % of companies with upward trajectory
3. **"Fastest Car" recommendation** — automatically identify the best stock in each sector
   - Best = lowest PEG + upward trajectory + highest execution score
   - Show: "🏆 TATA ELXSI is the fastest car in IT Services — PEG 0.7, trajectory ↑↑, 80% guidance met"
4. **Sector page** (`/sector/[sector]`) — new page showing:
   - Sector health snapshot
   - All tracked stocks in sector as a race leaderboard
   - Comparative trajectory chart (multiple stocks on same chart)

#### What the User Sees

**Peer Comparison Table (on stock page):**

| # | Company | PAT Growth | Fwd PE | PEG | Trajectory | Execution | Upside | Phase | Why |
|---|---------|------------|--------|-----|------------|-----------|--------|-------|-----|
| 🏆 | TATA ELXSI | 30% | 38x | 0.7 | ↑↑ | 9/10 | +45% | Phase 1 | Fastest growth, lowest PEG, 3Q upward |
| 2 | LTTS | 22% | 35x | 1.1 | ↑ | 7/10 | +25% | Phase 2 | Steady but slower |
| 3 | MPHASIS | 15% | 30x | 1.5 | → | 6/10 | +10% | Phase 2 | Stable but no acceleration |
| 4 | PERSISTENT | 18% | 45x | 2.5 | ↓ | 5/10 | -5% | Phase 3 | Expensive and slowing |

**Sector Snapshot Card:**
> **IT Services — Sector Tailwind ↑**
> 3/4 companies reporting upward guidance. Average PAT growth: 21%. Average PEG: 1.45.
> Best opportunity: TATA ELXSI (PEG 0.7, Phase 1)

#### Acceptance Criteria

- [ ] Peer table populates automatically when 2+ companies in same sector are analyzed
- [ ] "Fastest car" recommendation auto-calculated and displayed
- [ ] Sector snapshot aggregates trajectory signals from all analyzed companies
- [ ] New `/sector/[sector]` page exists with race leaderboard
- [ ] Trajectory comparison chart shows multiple stocks' guidance lines on same chart

#### Example User Flow

1. User has analyzed TATA ELXSI, LTTS, MPHASIS, PERSISTENT (all IT Services)
2. Goes to TATA ELXSI's stock page → scrolls to "Sector Race" section
3. Sees peer comparison table with TATA ELXSI highlighted as 🏆
4. Sees sector snapshot: "3/4 upward → sector tailwind"
5. Clicks "View Full Sector Race" → goes to `/sector/IT Services`
6. Sees comparative trajectory chart: 4 colored lines showing each company's guidance trajectory
7. Sees recommendation: "Add fuel to TATA ELXSI (Phase 1, fastest car)"

---

### Phase 5: Session Notebook & Portfolio Fit (2-3 days)

**Goal**: Per-stock investment thesis notes, "Why I own it" journal, switch triggers, and quarterly update log. The notebook turns analysis into action.

#### What Gets Built

1. **Stock Notes** — per-stock markdown notes with categories:
   - "Why I Own It" — free-text thesis, updated quarterly
   - "Switch Trigger" — specific conditions for exit (e.g., "two guidance cuts")
   - "Quarterly Update" — auto-generated summary after each new analysis
   - "Observation" — ad-hoc notes during research
2. **Notes API** — CRUD endpoints for stock notes
3. **Notes UI** — tab or section on stock page with:
   - Current thesis displayed prominently
   - Switch trigger displayed as a warning banner
   - Timeline of quarterly updates
   - "Add Note" button with category selector
4. **Portfolio Dashboard** — overview of all "owned" stocks
   - Shows: current phase, trajectory, PEG, switch triggers, thesis summary
   - Highlights stocks where switch triggers may be firing (guidance cuts detected)
   - Car race metaphor: "Your garage" showing each car's status

#### What the User Sees

**Stock Page — Notes Section:**

> **📝 Why I Own TATA ELXSI**
> "Fastest growing IT services company with PEG 0.7. Management has raised guidance 3 consecutive quarters. Strong order book of ₹3,200 cr provides 18-month revenue visibility. Capex on track."
> *Last updated: Q3FY26*
>
> **⚠️ Switch Trigger**
> "Exit if: (1) two consecutive quarters of guidance cuts, or (2) order book declines below ₹2,500 cr, or (3) PEG exceeds 1.5 without guidance improvement"
>
> **📅 Quarterly Updates**
> - Q3FY26: Guidance raised to 30% (was 25%). Order book +45% QoQ. Phase 1 confirmed. ↑
> - Q2FY26: Guidance raised to 25% (was 20%). New ₹400 cr contract. Phase 1. ↑
> - Q1FY26: Initial analysis. Guidance 20%. PEG 0.9. Phase 1. Entered position.

**Portfolio Dashboard:**

| Stock | Phase | PEG | Trajectory | Thesis | Switch Trigger Status |
|-------|-------|-----|------------|--------|----------------------|
| TATA ELXSI | 🟢 Phase 1 | 0.7 | ↑↑ | Fastest IT car | ✅ All clear |
| HDFC BANK | 🟡 Phase 2 | 1.1 | ↑ | Best banking car | ✅ All clear |
| RELIANCE | 🔴 Phase 3 | 2.1 | ↓ | Was diversification play | ⚠️ 2 guidance cuts — EXIT |

#### Acceptance Criteria

- [ ] User can create/edit/delete notes per stock with categories
- [ ] Switch trigger displayed as warning banner on stock page
- [ ] Quarterly update auto-generated after each analysis
- [ ] Portfolio dashboard shows all stocks with phase, trajectory, thesis summary
- [ ] Switch trigger fires visual alert when conditions are detected (e.g., 2 guidance cuts)

---

### Phase 6: Multi-Document Upload & Result Deck (2-3 days)

**Goal**: Accept result decks and annual reports alongside concall transcripts. Extract financials (revenue, PAT, margins, ROE) from result decks. Tag document types.

#### What Gets Built

1. **Document type tagging** — upload form lets user tag each PDF as "concall", "result_deck", or "annual_report"
2. **Multi-document analysis** — pass concall + result deck together to Gemini in one call
3. **Financial extraction** — from result decks: revenue, EBITDA, PAT, margins, ROE/ROCE, debt/equity
4. **Management & Ownership** — from annual reports: promoter holding, institutional holding, management background
5. **Enhanced stock overview** — display extracted financials on stock page

#### What the User Sees

**Upload Form (enhanced):**
> Drop PDFs here:
> - TATAELXSI_Q3FY26_Concall.pdf → [concall ▼]
> - TATAELXSI_Q3FY26_Results.pdf → [result_deck ▼]
> - TATAELXSI_Annual_Report_FY25.pdf → [annual_report ▼]
> [Upload & Analyze]

**Financial Data (extracted from result deck, shown on stock page):**

| Metric | Q1FY26 | Q2FY26 | Q3FY26 | Trend |
|--------|--------|--------|--------|-------|
| Revenue (₹ cr) | 1,500 | 1,650 | 1,850 | ↑ |
| PAT (₹ cr) | 300 | 350 | 420 | ↑↑ |
| EBITDA Margin | 17% | 18% | 19% | ↑ |
| PAT Margin | 14% | 15% | 16% | ↑ |
| ROE | 22% | 23% | 25% | ↑ |

#### Acceptance Criteria

- [ ] Upload form supports document type tagging (concall / result_deck / annual_report)
- [ ] Gemini receives all documents for a quarter together
- [ ] Financial metrics extracted from result deck and stored
- [ ] Stock page shows quarterly financial trend table
- [ ] Annual report data populates management & ownership section

---

### Phase 7: Race Dashboard UX Polish (2-3 days)

**Goal**: Make every screen feel like a car race dashboard. Green for acceleration, red for deceleration, race metaphors in language, speedometer for phase, trajectory charts everywhere.

#### What Gets Built

1. **Race-themed visual language** throughout the app:
   - Phase 1 cards: green gradient, ↑↑ arrows, "Add Fuel" button
   - Phase 3 cards: red gradient, ↓↓ arrows, "Switch Car" warning
   - Phase 4 cards: amber, → arrows, "Pit Stop — Watch" label
2. **Dashboard as Garage** — shows your "cars" (stocks) with their race status
3. **Sector as Race Track** — sector pages look like a race leaderboard
4. **Speedometer widget** — enhanced phase speedometer with animated needle that reflects trajectory
5. **Action buttons with race language**:
   - "🏁 Start Race" instead of "Analyze"
   - "⛽ Add Fuel" for Phase 1 stocks (meaning: add more investment)
   - "🔧 Pit Stop" for Phase 4 (meaning: watch and wait)
   - "🚗💨 Switch Car" for Phase 3 (meaning: exit and find better)
6. **Trajectory sparklines** — tiny colored line charts on cards showing guidance direction at a glance
7. **Onboarding tooltips** — first-time user sees brief explanations of the car race methodology

#### What the User Sees

**Dashboard (Race HQ):**
> **🏁 Your Garage — 8 Cars Tracked**
>
> ⛽ **2 Cars Accelerating** (Phase 1) — TATA ELXSI, KAYNES TECH
> 🏎️ **3 Cars at Speed** (Phase 2) — HDFC BANK, TITAN, BAJAJ FIN
> 🔧 **2 Cars in Pit Stop** (Phase 4) — HUL, ITC
> ⚠️ **1 Car Slowing** (Phase 3) — RELIANCE → Consider switching
>
> **Latest Race Updates:**
> - TATA ELXSI Q3: Guidance raised to 30% ↑↑ — Still fastest in IT Services!
> - RELIANCE Q3: Second guidance cut ↓↓ — Switch trigger firing!

---

## 10. Data Requirements — What the User Needs to Upload

### Per Company, Per Quarter

| Document | What It Provides | Priority |
|----------|-----------------|----------|
| **Con-call transcript (PDF)** | Guidance, tone, strategy, Q&A — THE essential input | **Required** |
| **Quarterly result deck (PDF)** | Revenue, PAT, margins, segment data, capex updates | Highly recommended |
| **Annual report (PDF)** | Promoter holding, management background, detailed 5-year financials | Optional (once/year) |

### What the System Fetches Automatically

- Current stock price, PE ratio, EPS, EPS growth, market cap, 52-week range (via yfinance)
- Basic company info: name, exchange, sector, industry (via yfinance)

### What the User Does NOT Need

- Historical price charts (not used — forward-looking only)
- Broker reports (potentially biased — management's words only)
- Macro reports (bottom-up philosophy — sector data comes from peers' con-calls)

---

## 11. Accuracy Maximization Strategy

### Model-Level

1. **Gemini 2.5 Flash with structured output** — schema-enforced JSON means zero parsing errors
2. **Full transcript in context** — no 8K truncation; Gemini reads the complete 30-60K token transcript
3. **Temperature 0.2** — low creativity, high precision for financial data extraction
4. **Thinking mode enabled** — Gemini shows reasoning chains, catches contradictions

### Prompt-Level

1. **Previous quarter context** — Gemini cross-references past guidance for fulfillment tracking
2. **Explicit extraction rules** — every number in ₹ crore, every highlight must contain data
3. **Contradiction detection** — Gemini flags when management language contradicts prior quarter
4. **Sector-aware prompting** — different metrics for manufacturing vs IT vs banking vs retail
5. **Distinguish management guidance vs analyst questions** — avoid capturing analyst estimates as company guidance

### System-Level

1. **Multi-document input** — concall + result deck together gives more cross-verification data points
2. **Human-in-the-loop** — manual override for actuals when auto-detection fails
3. **Version tracking** — re-analyze with improved prompts without losing historical data
4. **Confidence scoring** — Gemini reports confidence per field; low-confidence items get flagged for review
5. **Validation workflow** — compare Gemini output against your manual ChatGPT analysis for 5-10 companies; iterate prompt

---

## 12. Environment Variables (Complete)

```bash
# Analysis Provider
ANALYSIS_PROVIDER=gemini              # "gemini" or "ollama"

# Gemini
GEMINI_API_KEY=your-api-key           # From https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash         # or gemini-2.5-pro

# Ollama (fallback)
OLLAMA_MODEL=llama3.2:latest
OLLAMA_BASE_URL=http://localhost:11434

# Existing
MONGO_URI=mongodb://localhost:27017
DB_NAME=quantumstock
SPACY_MODEL=en_core_web_sm
JWT_SECRET=your-secret
ADMIN_PASS=your-password
```

---

## 13. Complete Checklist-to-Feature Mapping

| # | Checklist Section | Phase Built | Key Features |
|---|-------------------|-------------|-------------|
| 1 | Sector Snapshot | Phase 4 | Peer aggregation, sector health score, tailwind/headwind |
| 2 | Business Model & Moat | Phase 1 | Gemini extracts model, moat signals, competitive advantages |
| 3 | Management & Ownership | Phase 6 | Annual report upload, promoter holding, credibility score |
| 4 | Financial Performance | Phase 6 | Result deck extraction, quarterly trends table |
| 5 | Con-Call Deep Dive & Guidance Tracker | Phase 1 + 2 | Gemini analysis (P1), trajectory chart + contradictions (P2) |
| 6 | Peer Comparison | Phase 4 | Sector race leaderboard, fastest car recommendation |
| 7 | Forward Valuation & Scenarios | Phase 3 | Exact table format, PAT-based PEG, auto-fill from guidance |
| 8 | Investment Decision & Portfolio | Phase 5 | 3-point thesis, session notebook, switch triggers, portfolio dashboard |

---

## 14. Suggested Next Steps for Implementation

### Immediate (Today)

1. **Get Gemini API key** — https://aistudio.google.com/apikey (free, no credit card needed)
2. **Test the free tier** — 15 requests/minute, 1000/day is plenty for personal research
3. **Prepare 2-3 real concall PDFs** you've already analyzed with ChatGPT for comparison testing

### Week 1: Phase 1

1. Build `gemini_analyzer.py` with the enhanced prompt
2. Wire into the analysis pipeline
3. Upload a concall → compare Gemini output vs your ChatGPT analysis
4. Iterate the prompt until quality matches your expectations
5. Update frontend drawer to display new fields

### Week 2: Phase 2

1. Build trajectory calculation from guidance numbers
2. Add contradiction detection via previous-quarter context passing
3. Build trajectory chart component
4. Add Surprise and Contradictions columns to tracker

### Week 3: Phase 3

1. Overhaul valuation table to exact format
2. Auto-fill growth rate from extracted guidance
3. Add PE re-rating potential and dual upside calculation
4. Phase classification integrates trajectory

### Week 4+: Phases 4-7

1. Peer comparison when 3+ companies in a sector
2. Session notebook and portfolio dashboard
3. Multi-document upload and result deck parsing
4. Race dashboard UX polish

### What You Can Always Keep Doing

- Ollama remains as free offline fallback
- yfinance continues fetching market data
- SpaCy can stay for lightweight pre-processing if needed
- All existing data in MongoDB is preserved
- Every feature is additive — nothing breaks existing functionality

---

## 15. Summary: From Data App to Race Dashboard

| Aspect | Current App | Target App |
|--------|------------|------------|
| **Analysis quality** | SpaCy keywords + Ollama 3B = poor | Gemini Flash = high accuracy, comprehension |
| **Guidance tracking** | Basic met/missed table | Full trajectory chart with colored lines, contradictions, surprise |
| **Valuation** | Simplified EPS-based | Exact PAT-based table with PE re-rating, auto-fill from guidance |
| **Phase classification** | PEG + growth only | PEG + growth + trajectory direction |
| **Peer comparison** | None | Sector race leaderboard, fastest car recommendation |
| **Investment thesis** | None | 3-point thesis, switch triggers, session notebook |
| **Dashboard feel** | Generic stats page | Race HQ: "Your Garage", phase alerts, trajectory sparklines |
| **Decision support** | User figures it out | App tells you: "Add fuel", "Hold", "Switch cars", "Watch pit stop" |

The app transforms from a data viewer into an **opinionated race dashboard** that teaches and reinforces the investor's methodology in every interaction.

---

## 16. Authentication & Access Strategy

### Philosophy

Exploring the app should never require login. Users should be able to browse the dashboard, explore stocks, view analysis results, and check valuations without creating an account. Login is only required when the user wants to **take action** — upload PDFs, run analysis (LLM calls), calculate valuations, or modify data.

### Public Endpoints (No Auth)

All `GET`/read endpoints are public:
- Dashboard stats, recent stocks, stock summaries
- Con-call listing and guidance tracker
- Valuation results
- News

### Protected Endpoints (Auth Required)

All `POST`/`PUT`/`DELETE`/write endpoints require authentication:
- Stock search (writes to DB via yfinance)
- PDF upload, analyze, reanalyze
- Delete/clear concalls
- Calculate valuation, manual override

### User Roles

| Role | Created By | Current Access | Future Access |
|------|-----------|----------------|---------------|
| `admin` | `seed.py` | Full access | Full access + user management |
| `user` | Signup | Full access (same as admin for now) | Read + limited writes; admin-gated features TBD |

### Frontend Behavior

- **Dashboard/Explore/Stock pages**: Always accessible. Header shows "Sign in / Sign up" buttons for anonymous users, avatar dropdown for authenticated users
- **Action buttons** (Upload, Analyze, Delete, Calculate): Only shown when authenticated
- **Concalls page**: Upload dropzone replaced with "Sign in to analyze" prompt for anonymous users
- **Login/Signup pages**: Redirect to `/dashboard` if user is already authenticated

### Future Role Restrictions (Planned)

- Normal users: rate-limited analysis calls
- Admin: user management, system configuration, prompt editing
- Role-based feature gating in later phases
