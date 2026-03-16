# QuantumStock — Investment Thesis & Philosophy

*A living document that captures the "why" behind every feature, the logic we follow, what works, what needs improvement, and where we can experiment. Updated after every significant change.*

---

## What Is QuantumStock?

QuantumStock is a **personal equity research command center for Indian markets (NSE/BSE)** that replaces opinions, market noise, and price charts with a single source of truth: **what management actually says in earnings call transcripts**.

The idea: instead of following analysts, TV channels, or Twitter tips, read what the CEO and CFO promised in the earnings call, check if they delivered, and decide whether this company is the best "car" in its sector race.

---

## The Core Philosophy

### 1. Forward-Looking Only

The stock market is a forward-looking engine. Past price charts, historical P/E ratios, and macro reports tell you where the stock *was*, not where it's *going*. QuantumStock deliberately ignores all of these.

Instead, everything revolves around:
- **What did management guide for the future?** (Revenue growth, PAT targets, margin goals, capex plans)
- **Are they on track to deliver?** (Compare this quarter's actuals with last quarter's promises)
- **Is the guidance getting better or worse?** (The trajectory — accelerating, flat, or decelerating)

### 2. Management's Words Are the Truth Source

No external analyst opinion, no broker note, no "fair value" from a website. The only input is **the actual earnings call transcript PDF**, analyzed by AI to extract:
- Exact numbers management quoted
- Forward guidance with specific metrics and time periods
- Tone of confidence (are they being specific or evasive?)
- Execution track record (did they deliver what they promised last quarter?)

### 3. The Car Race Analogy

Every sector is a race. Every stock is a car. The investor's job is to:

| Action | When |
|--------|------|
| **Pick the fastest car** | The company with the strongest guidance, best execution, and most credible management in its sector |
| **Add fuel** | When guidance is being raised quarter after quarter (accelerating trajectory) |
| **Hold steady** | When the car is still fast but PE is getting expensive (watch for slowdown signals) |
| **Switch cars** | When guidance is cut twice, management makes excuses, or a peer starts overtaking |

### 4. Direction > Absolute Numbers

A company growing 10% → 20% → 30% is far more exciting than one growing 80% → 50% → 30%, even though the second has higher absolute numbers. The first is accelerating; the second is decelerating and heading for a trap.

This is why **guidance trajectory** (up/down/flat vs previous quarters) matters more than the number itself.

### 5. The 4-Phase Framework

Every stock falls into one of four phases based on two simple metrics:
- **PEG Ratio** = Forward P/E ÷ PAT Growth Rate
- **Guidance Trajectory** = Is growth accelerating, flat, or decelerating?

| Phase | What It Means | PEG | Trajectory | What To Do |
|-------|--------------|-----|------------|------------|
| **Phase 1: Bargain** | Cheap AND growing fast | < 1 | Up | Buy aggressively — this is the sweet spot |
| **Phase 2: Momentum** | Expensive BUT still growing fast | ~1-1.5 | Up | Hold carefully — one guidance miss and it becomes Phase 3 |
| **Phase 3: Trap** | Expensive AND slowing down | > 1.5 | Down | Exit immediately — the market will re-rate this downward |
| **Phase 4: Turnaround** | Cheap BUT not growing yet | < 1 | Flat/starting | Watch closely — if trajectory turns up, it becomes Phase 1 |

**The goal is to always be in Phase 1.** Enter when a stock enters Phase 1, add when it stays there, and exit the moment it shifts toward Phase 3.

---

## How QuantumStock Makes This Practical

### Step 1: Upload Earnings Call PDFs

The user downloads earnings call transcript PDFs from company websites, BSE/NSE filings, or investor relations pages. Upload 1-8 PDFs at a time per company.

**What happens behind the scenes:**
- The PDF is stored permanently in MongoDB (GridFS) — you can always re-analyze it later
- The full text is extracted using pdfplumber
- The extracted text is stored alongside the PDF for instant re-analysis without re-reading the PDF

### Step 2: AI Analyzes the Transcript

A single Google Gemini API call reads the full transcript and extracts 30+ structured fields:

| What It Extracts | Why It Matters |
|-----------------|---------------|
| **Detailed summary** (1500-3000 word research note) | Professional-grade concall summary with exact quotes and numbers |
| **Structured guidance** (every forward-looking statement) | The heart of the system — specific metrics, ranges, time periods, conditions |
| **Guidance revision status** (new/raised/maintained/lowered/withdrawn) | Is the trajectory accelerating or decelerating? |
| **Tone score** (1-10) | Is management being transparent or evasive? |
| **Execution score** (1-10) | Did they deliver on past promises? |
| **Green/red flags** | Specific business signals with evidence |
| **Investment thesis** (3 bullets) | Why buy, risks, and exit trigger |
| **Financial metrics** (revenue, PAT, margins, growth rates) | Backward-looking reported numbers for comparison |
| **Capex plans** | Specific amounts, timelines, and expansion details |

### Step 3: Guidance Tracker Shows the Movie

A single concall snapshot tells you one frame. The **Guidance Tracker** shows the full movie across quarters:

- What management guided for each quarter
- Whether they delivered (met, missed, partially met)
- Whether they raised, lowered, or maintained guidance
- The overall trajectory — is the "car" accelerating or slowing down?

This handles 15 real-world guidance cases: explicit numbers, vague language ("high teens"), conditional guidance, implicit confirmations, segment-wise splits, guidance withdrawals, contradictions with prior calls, and more.

### Step 4: Forward Valuation Tells You the Price

Using the growth rate from management's own guidance, the valuation page calculates:

| Metric | Formula |
|--------|---------|
| Forward EPS | Current EPS × (1 + Growth Rate) |
| Forward P/E | Current Price ÷ Forward EPS |
| PEG | Forward P/E ÷ Growth Rate |
| Fair Value | Current EPS × Growth Rate (Lynch formula) |
| Upside % | (Fair Value - Current Price) ÷ Current Price |

Three scenarios (Base, Bull, Bear) show what happens if growth is exactly as guided, 10% better, or 10% worse. The **Phase Speedometer** immediately tells you which phase the stock is in.

**Full transparency:** The page shows exactly which concall, which quarter, which specific guidance statement was used, and what assumptions were made. Nothing is hidden.

### Step 5: Compare Within Sector

The Explore page lets you browse all tracked companies, filter by sector, and sort by growth/PEG/phase. The goal: find the fastest car in each sector race.

---

## What Makes This Different from Screener.in / Moneycontrol / Trendlyne?

| Feature | Screener/Moneycontrol | QuantumStock |
|---------|----------------------|-------------|
| Data source | Historical financials, broker consensus | Management's own words from concalls |
| Forward valuation | Based on analyst estimates | Based on AI-extracted management guidance |
| Guidance tracking | Not available | Full quarter-by-quarter tracker with revision status |
| Philosophy | Show data, let user interpret | Opinionated 4-phase framework with clear buy/hold/exit signals |
| Concall analysis | Read it yourself | AI generates institutional-grade structured summary |
| Customization | Limited | Your own uploaded PDFs, your own growth rate overrides |
| Cost | Subscription | One-time Gemini API cost (~₹1-2 per concall) |

---

## How Practical Is This?

### What Works Well Today

1. **Guidance extraction accuracy**: The AI correctly identifies explicit numbers, vague language, conditional statements, and cross-quarter revisions in most cases
2. **Valuation transparency**: Every number is traceable — the user sees exactly which guidance was used and what assumptions were made
3. **Speed**: Analysis takes ~15-30 seconds per concall vs hours of manual reading
4. **Cost**: ~₹1-2 per concall (Gemini Flash pricing), stored permanently for unlimited re-reading
5. **No cloud dependency for data**: All PDFs, analyses, and valuations stay in your local MongoDB

### What Needs More Work

1. **Sector-level comparison**: Currently you compare stocks manually by browsing Explore. A dedicated "Sector Race" view that ranks all stocks in a sector by trajectory + PEG would make the car race analogy come alive
2. **Trajectory visualization**: A chart showing guidance direction across quarters (colored line: green=accelerating, red=decelerating) would instantly communicate the "speedometer" concept
3. **Contradiction detector**: When management says "on track" one quarter and "delayed" the next, this should be prominently flagged with a comparison view
4. **Peer concall cross-reference**: When analyzing one company, the system could reference what peers are saying about the same sector dynamics
5. **Session notebook**: Per-stock notes where you write "Why I own this" and update quarterly — connecting the analysis to your personal conviction
6. **Portfolio tracking**: Aggregate your holdings, show which phase each is in, flag exits needed
7. **Automatic financial data**: Currently uses Yahoo Finance for EPS/price. Integration with BSE/NSE direct data would improve reliability

### Things to Experiment With

1. **Multi-quarter momentum scoring**: Instead of just "raised vs lowered," calculate a weighted momentum score across 3-4 quarters. Give more weight to recent quarters
2. **Management credibility score**: Track how often management delivers on promises. A CEO with 90% guidance hit rate deserves more trust than one with 50%
3. **Implied growth from capex**: If management guides ₹500 cr capex with 25% ROCE, that implies ₹125 cr incremental earnings — this could auto-calculate
4. **Sentiment from Q&A section**: The Q&A portion of concalls often reveals what management is uncomfortable with. AI could specifically analyze evasive answers vs direct ones
5. **Auto-flagging Phase 3 transitions**: When a stock moves from Phase 2 to Phase 3 (PE stays high but growth slows), auto-generate an alert
6. **Peer PEG comparison chart**: Side-by-side PEG comparison for all stocks in a sector, updated as new concalls come in
7. **Multi-year CAGR valuation**: Instead of single-year forward valuation, show what happens if growth compounds for 2-3 years (especially for "double in 3 years" type guidance)

---

## The Decision Framework in Practice

### When to Buy (Enter Phase 1)

All three conditions must be true:
1. PEG < 1 (stock is cheap relative to its growth)
2. Guidance trajectory is UP (management raised guidance or maintained strong guidance)
3. Execution score > 6 (management has delivered in recent quarters)

### When to Add More

1. Still in Phase 1 after a new concall
2. Guidance was RAISED from previous quarter
3. No red flags appeared

### When to Hold and Watch

1. Phase 2 (PEG 1-1.5, still growing fast)
2. Monitor every concall closely — one guidance cut and it could become Phase 3

### When to Exit

1. Two consecutive guidance cuts (raised→maintained→lowered = warning; raised→lowered→lowered = exit)
2. Phase shifts to 3 (high PE + slowing growth)
3. Management credibility drops (missed guidance + evasive tone)
4. A peer in the same sector enters Phase 1 with stronger trajectory (switch cars)

---

## Data Flow: End to End

```
1. User discovers a company worth researching
2. Downloads earnings call transcript PDFs (1-3 recent quarters)
3. Uploads PDFs to QuantumStock
4. AI analyzes each transcript → structured guidance, summary, scores
5. Guidance Tracker shows trajectory across quarters
6. Forward Valuation calculates PEG and phase
7. User decides: Buy (Phase 1), Hold (Phase 2), Exit (Phase 3), or Watch (Phase 4)
8. Next quarter: upload new concall → system auto-compares with previous guidance
9. Trajectory updates → phase may change → action may change
10. Repeat every quarter for every stock in your universe
```

---

## Key Assumptions and Limitations

1. **Management may lie or mislead**: The system takes guidance at face value. A dishonest management team will produce wrong signals. The execution score and contradiction detector help, but due diligence on management quality is still the user's responsibility
2. **AI extraction is not 100% perfect**: Complex transcripts with unusual formatting, multiple languages, or very indirect guidance may be partially missed. Always spot-check the summary against the original PDF
3. **PEG is a simplification**: The PEG ratio assumes linear growth, which doesn't capture margin expansion, operating leverage, or cyclical patterns. Use it as a quick filter, not a final answer
4. **Yahoo Finance data may be stale**: EPS and price are fetched from Yahoo Finance, which can have delays or inaccuracies. Manual override is available for this reason
5. **Single-year forward valuation**: Currently projects one year forward. Multi-year compounding (e.g., 3-year CAGR targets) is handled by using the CAGR as the growth rate, but true multi-year DCF is not yet implemented
6. **No macro overlay**: The system deliberately ignores macro factors (interest rates, GDP growth, government policy). This is by design (the philosophy says "no market noise"), but some sectors are genuinely macro-sensitive

---

## Version History

| Date | Change | Impact |
|------|--------|--------|
| March 2026 | Initial app with SpaCy + Ollama | Basic analysis, poor quality |
| March 2026 | Migrated to Google Gemini 2.5 Flash | 10x quality improvement in summaries and guidance extraction |
| March 2026 | Added structured guidance (15 cases) | Guidance tracker transformed from "bunch of tags" to structured table with revision tracking |
| March 2026 | 7-strategy growth rate waterfall | Valuation no longer defaults to 20% when guidance exists in any form |
| March 2026 | Local slider preview (no DB save) | Experimental slider changes don't pollute DB or inflate metrics |
| March 2026 | Token analytics storage | Every AI call tracked with input/output tokens, timing, and retry info |

---

*This document should be updated whenever the investment logic, phase framework, or decision rules change. It is the single reference for understanding "why does the app work this way?" — not the technical how, but the philosophical why.*
