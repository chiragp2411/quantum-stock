# AI Calls & Token Consumption

## Where AI (Gemini) Calls Are Made

QuantumStock makes Gemini API calls in **exactly one place**: the `analyze_concall_gemini()` function in `backend/app/concalls/gemini_analyzer.py`.

This function is called when a user clicks "Analyze" on uploaded con-call PDFs. There are **no other AI calls** in the system.

### Call Flow

```
User clicks "Analyze Pending" in frontend
  → POST /api/concalls/{symbol}/analyze
    → Worker thread picks up job from queue
      → _analyze_single_concall()
        → analyze_concall_gemini()          ← ONLY AI CALL
          → Google Gemini API
        → Result saved to MongoDB
```

### What Is NOT an AI Call

| Feature | How It Works | AI Involved? |
|---------|-------------|-------------|
| **PDF Upload** | pdfplumber extracts raw text | No |
| **Forward Valuation** | Math formulas (EPS × growth, PEG) | No |
| **Guidance Prefill** | Reads stored analysis from DB | No |
| **Dashboard Stats** | MongoDB aggregation queries | No |
| **Stock Search** | Yahoo Finance API (yfinance) | No |
| **Explore Page** | MongoDB queries with pagination | No |
| **Guidance Tracker** | Reads stored analysis, compares quarters | No |

## Token Consumption Per Request

### Input Tokens (What We Send to Gemini)

| Component | Approximate Tokens | Notes |
|-----------|-------------------|-------|
| System prompt | ~2,500 tokens | Fixed — the instruction set for extraction rules |
| Transcript text | ~8,000-25,000 tokens | Varies by transcript length (typically 20-80 pages) |
| Previous quarter context | ~500-2,000 tokens | Compact JSON of up to 2 previous quarters' structured guidance |
| JSON schema | ~800 tokens | Pydantic model schema for structured output |
| **Total input** | **~12,000-30,000 tokens** | |

### Output Tokens (What Gemini Returns)

| Component | Approximate Tokens | Notes |
|-----------|-------------------|-------|
| Detailed summary | ~2,000-4,000 tokens | 1500-3000 word markdown document |
| Structured guidance | ~500-2,000 tokens | 5-20 guidance items with quotes |
| Highlights, flags, thesis | ~300-600 tokens | Lists of key items |
| Financial fields | ~100-200 tokens | Quarter, scores, metrics |
| **Total output** | **~3,000-7,000 tokens** | |

### Token Limits Configuration

| Attempt | `max_output_tokens` | When Used |
|---------|-------------------|-----------|
| 1st attempt | 32,768 | Default first try |
| 2nd attempt (retry) | 65,536 | If first attempt fails (truncation, validation error) |
| 3rd attempt (retry) | 65,536 | Final retry with same higher limit |

### Cost Estimate (Gemini 2.5 Flash)

Based on Gemini 2.5 Flash pricing (as of March 2026):

| Metric | Per Concall | Per 10 Concalls |
|--------|------------|-----------------|
| Input tokens | ~15,000-30,000 | ~150,000-300,000 |
| Output tokens | ~3,000-7,000 | ~30,000-70,000 |
| Estimated cost | ~$0.01-0.03 | ~$0.10-0.30 |

Costs are very low because we make a single call per concall and store the result.

## Data Storage Strategy (Avoiding Multiple AI Calls)

### One-Time Analysis, Stored Forever

The core design principle is: **analyze once, query many times**.

```
PDF Upload → Extract Text (pdfplumber, free)
           → Store raw_text in MongoDB
           → Gemini Analysis (ONE API call)
           → Store complete analysis in MongoDB
                ↓
           All subsequent features read from DB:
           ├── Valuation page reads stored guidance
           ├── Guidance tracker reads stored guidance
           ├── Summary drawer reads stored summary
           └── Dashboard reads stored metrics
```

### What Is Stored in MongoDB

After analysis, the `concalls` collection document contains:

```json
{
  "stock_symbol": "SKYGOLD.NS",
  "pdf_filename": "SKYGOLD_Q3FY26_Concall.pdf",
  "raw_text": "... (full transcript text) ...",
  "status": "completed",
  "analysis": {
    "quarter": "Q3FY26",
    "detailed_summary": "... (1500-3000 word markdown) ...",
    "highlights": ["...", "..."],
    "structured_guidance": [
      { "metric": "revenue", "value_text": "₹8100 cr", "period": "FY27", ... },
      { "metric": "pat_margin", "value_text": "4.25%", "period": "FY27", ... }
    ],
    "guidance": { "key": "value" },
    "tone_score": 8,
    "management_execution_score": 7,
    "green_flags": ["..."],
    "red_flags": ["..."],
    "investment_thesis": ["...", "...", "..."],
    "revenue_cr": 6100,
    "pat_cr": 250,
    "pat_growth_yoy_pct": 82,
    ...
  }
}
```

### When Is Re-analysis Needed?

| Action | AI Call Made? | Why |
|--------|-------------|-----|
| View concall summary | No | Reads stored analysis |
| View valuation page | No | Reads stored guidance from DB |
| View guidance tracker | No | Reads and compares stored analyses |
| Upload new PDF (different quarter) | Yes (when analyzed) | New transcript needs analysis |
| Re-analyze (explicit button) | Yes | User requests fresh analysis |
| Slider changes on valuation | No | Client-side math only |

### Re-analysis (POST /{symbol}/reanalyze/{id})

Users can explicitly re-analyze a previously analyzed concall. This makes a new Gemini API call and overwrites the stored analysis. Use cases:
- Model upgrade (switched to a better Gemini model)
- Prompt improvements (updated system prompt)
- Previous analysis had errors

## Token Optimization Strategies

### 1. Single Comprehensive Call
Instead of multiple small calls (one for summary, one for guidance, one for flags), we make one large call that returns everything. This is more efficient because:
- Gemini only reads the transcript once
- No redundant input tokens
- Context is shared across all fields

### 2. Structured JSON Output
Using `response_mime_type: "application/json"` with a Pydantic schema ensures Gemini outputs parseable JSON directly, eliminating the need for post-processing calls.

### 3. Previous Quarter Context Is Compact
Instead of sending full previous analyses, we send only the structured guidance items (compact JSON), reducing context tokens by ~80%.

### 4. Retry with Higher Token Limit
If the first attempt is truncated (output too large for 32K tokens), we retry with 64K tokens. This avoids wasting the first attempt's input tokens on a lost cause — the retry usually succeeds.

### 5. JSON Repair Before Retry
Before retrying with higher tokens, we attempt to repair truncated JSON (fixing unclosed strings, brackets, trailing commas). If repair succeeds, we avoid the retry entirely, saving a full API call.

### 6. No Redundant Calls
The valuation page, guidance tracker, and dashboard all read from stored MongoDB data. They never make Gemini calls. Even the "Growth Rate Used" on the valuation page is derived from stored `structured_guidance`, not a new AI call.

## Monitoring Token Usage

To monitor actual token consumption, check the backend logs:

```
INFO: Calling Gemini (model=gemini-2.5-flash, text_len=45000, symbol=SKYGOLD.NS, attempt=1, max_tokens=32768)...
INFO: Gemini response received (12543 chars, attempt=1)
INFO: Gemini analysis complete: quarter=Q3FY26, tone=8, highlights=6, structured_guidance=12, ...
```

The `text_len` in the log gives the input text character count (divide by ~4 for approximate token count). The response char count similarly approximates output tokens.
