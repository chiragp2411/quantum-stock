# QuantumStock User Guide

Welcome to QuantumStock — your AI-powered equity research platform for Indian markets (NSE/BSE). This guide explains every feature to help you make informed investment decisions.

## Getting Started

### What is QuantumStock?
QuantumStock helps you analyze stocks through a systematic, management-centric process. Instead of looking at stock charts or macro reports, you focus on what company management says in their earnings calls — and whether they deliver on their promises.

### The Car Race Analogy
Think of each sector as a car race. Every stock is a car. Your job is to:
1. **Find the fastest car** — the company with strongest growth guidance
2. **Check the driver** — is management credible? Do they deliver on promises?
3. **Check the speedometer** — is guidance trending up (accelerating) or down (slowing)?
4. **Buy at the right price** — PEG ratio tells you if the speed is already priced in

### Do I Need to Log In?
- **No** — You can explore all data, view analyses, and browse stocks without logging in
- **Yes** — You need to log in to: upload con-call PDFs, run AI analysis, calculate valuations, or add notes

---

## Features

### 1. Dashboard
Your command center showing:
- **Stocks Tracked** — How many companies you're following (click to explore all)
- **Con-Calls Analyzed** — Total earnings calls analyzed by AI
- **Sectors Covered** — How many sectors you're tracking (click to filter)
- **Bargain Opportunities** — Stocks in Phase 1 (low price + high growth)
- **Quick Actions** — Links to explore stocks and upcoming features
- **Recent Activity** — Latest analyses with timestamps

### 2. Stock Search
Search any NSE/BSE stock by its ticker symbol (e.g., "RELIANCE", "TCS", "SGMART"). The system fetches real-time data from Yahoo Finance and saves it for tracking.

### 3. Con-Call Analysis (The Core Feature)
Upload earnings conference call transcripts (PDF format) and get AI-powered analysis.

**What you get from each analysis:**

| Section | What It Tells You |
|---------|------------------|
| **Summary** | Professional research note (1500-3000 words) with exact quotes, numbers, and management's own words |
| **Guidance** | What management is projecting for the future — revenue growth, PAT growth, capex plans, margins |
| **Business Model** | How the company makes money, its competitive advantages (moat), and market position |
| **Investment Thesis** | 3-point summary: Why buy, key risks, and what would trigger an exit |
| **Flags** | Green flags (positive signals) and Red flags (warning signs) |
| **Capex** | Capital expenditure plans, capacity utilization, geographic expansion |
| **Key Quotes** | Direct management quotes with specific numbers — the most important statements |

**How to use it:**
1. Go to any stock page → Con-Calls tab
2. Click "Upload PDFs" and drag your con-call transcript files
3. Click "Analyze Pending" to start AI analysis
4. Wait ~15-30 seconds per con-call (you'll see progress)
5. Click on any analyzed con-call to see the full report

**Tips:**
- Upload multiple quarters to see trends over time
- The AI compares with previous quarters to detect contradictions
- You can re-analyze any con-call if you want a fresh analysis

### 4. Guidance Tracker (The Heart of the App)
The Guidance Tracker answers the most important question: **Is management walking the talk?**

**What each column means:**
| Column | What It Shows |
|--------|--------------|
| **Period** | Which quarter (e.g., Q3FY26) |
| **Previous Guidance** | What management promised last quarter |
| **Actuals** | What they actually delivered |
| **Delivered** | ✅ Met / ❌ Missed / ⚡ Partial |
| **New Guidance** | What they're promising for next quarter |
| **Trajectory** | ↑ Guidance going up / ↓ Going down / → Flat |

**Management Credibility Badge:**
- 🛡️ **High Reliability (≥80%)** — "Veteran Driver" — you can trust their guidance
- 🛡️ **Medium Reliability (50-79%)** — "Developing Driver" — verify with caution
- ⚠️ **Low Reliability (<50%)** — "Unreliable Driver" — take guidance with a grain of salt

### 5. Financial Performance Charts
Visual trends extracted from con-call data:
- **Revenue / PAT** — Are absolute numbers growing quarter over quarter?
- **Margins** — Are EBITDA and PAT margins improving or declining?
- **Growth %** — Is the growth rate accelerating or decelerating?

### 6. Forward Valuation
Answers: **Is this stock fairly priced for its growth?**

**The 4 Phases (Car Race Positions):**

| Phase | What It Means | What To Do |
|-------|--------------|------------|
| **Phase 1: Pole Position** | Low price + High growth (PEG ≤ 1) | Best opportunity — Buy/Add |
| **Phase 2: Leading the Pack** | High price + High growth (PEG > 1.5) | Growing but expensive — Hold carefully |
| **Phase 3: Pit Stop Needed** | High price + Low growth (PEG > 1.5) | Overvalued and slowing — Consider exiting |
| **Phase 4: Back on Track** | Low price + Low growth (PEG ≤ 1) | Cheap but slow — Watch for Phase 1 shift |

**Key formula:** PEG = Forward P/E ÷ PAT Growth (%)
- PEG < 1 = Potentially undervalued
- PEG = 1 = Fairly valued
- PEG > 1.5 = Potentially overvalued

**How the growth rate is determined:**
1. The system automatically pulls growth guidance from your latest analyzed con-call
2. It shows you which quarter and which metric (PAT growth, revenue growth, etc.) it used
3. You can always override it manually with the slider

**Three scenarios are calculated:**
- **Base Case** — Uses the guided growth rate
- **Bull Case** — If things go better than expected (+10% by default)
- **Bear Case** — If things go worse than expected (-10% by default)

### 7. Session Notebook
Your personal investment diary for each stock. Record:
- **Investment Thesis** — Why you own this stock (update after each quarter)
- **Observations** — Interesting patterns or data points you noticed
- **Switch Triggers** — Conditions that would make you sell (e.g., "Two consecutive guidance cuts")
- **Quarterly Updates** — Notes after reviewing each earnings call

### 8. Explore Stocks
Browse all tracked stocks in a sortable, searchable table:
- Search by name, symbol, or sector
- Filter by sector
- Sort by EPS growth, PE ratio, market cap, or number of con-calls
- See category badges and valuation phase at a glance

---

## Glossary

| Term | Plain English | Analogy |
|------|--------------|---------|
| **Con-Call** | Earnings conference call — management discusses quarterly results | Like a team captain's post-match interview |
| **PEG Ratio** | Price relative to growth — is the stock's speed already priced in? | Like comparing a car's price to its top speed |
| **Guidance** | Management's projection for future performance | Like a weather forecast from the weatherman |
| **Trajectory** | Direction guidance is moving (up/down/flat) | Like a speedometer needle — going up or down? |
| **Tone Score** | How confident and transparent management sounds (1-10) | Like reading body language in a conversation |
| **Execution Score** | How well management delivers on past promises (1-10) | Like checking a delivery service's track record |
| **EBITDA** | Profit before interest, tax, and accounting adjustments | Like your salary before tax deductions |
| **PAT** | Profit After Tax — the actual bottom line | Like your take-home pay after all deductions |
| **Moat** | Competitive advantage that protects the business | Like a castle's moat keeping invaders out |
| **Capex** | Money spent on expanding the business (new factories, stores, etc.) | Like investing in a bigger kitchen to serve more customers |

---

## FAQ

**Q: What PDFs should I upload?**
A: Upload earnings conference call transcripts. These are typically available on the company's investor relations page or on BSE/NSE websites.

**Q: Do I need to upload annual reports?**
A: Not yet. Currently the app only processes con-call transcripts. Annual report support is planned for a future update.

**Q: Is my data stored securely?**
A: Yes. All PDFs are stored locally in your MongoDB database. No data is sent to any cloud service except the transcript text to Google Gemini for analysis.

**Q: Can I upload con-calls in any order?**
A: Yes! The system identifies each con-call's fiscal quarter from the content and sorts them correctly regardless of upload order.

**Q: Why does the growth rate change when I analyze a new con-call?**
A: The valuation page auto-fills the growth rate from the latest con-call's guidance. When you analyze a newer quarter with updated guidance, the growth rate updates to reflect management's latest projection.

**Q: What if management doesn't give specific guidance?**
A: The system falls back to extracted actual growth rates (like PAT growth YoY%). If even that's unavailable, it defaults to 20% and lets you adjust manually.
