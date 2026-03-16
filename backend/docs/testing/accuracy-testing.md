# Accuracy Testing Guide

## Why Accuracy Matters

QuantumStock's investment decisions depend entirely on the accuracy of:
1. **Guidance extraction** — the structured metrics, ranges, and revision status
2. **Summary quality** — capturing every important detail from the transcript
3. **Valuation derivation** — correctly translating guidance into a growth rate

A wrong guidance extraction can lead to a wrong phase classification, which leads to a wrong buy/sell signal.

## How to Test Accuracy

### Method 1: Manual Cross-Verification (Recommended)

The gold standard is comparing QuantumStock output against a manual reading of the transcript.

**Steps:**

1. **Pick a company with a publicly available concall** (e.g., from BSE/NSE filing, company IR page)
2. **Read the transcript manually** and note:
   - Key financial numbers mentioned (revenue, PAT, EBITDA, margins)
   - Forward guidance given by management (metrics, ranges, periods)
   - Tone and sentiment of the call
   - Any guidance revisions vs previous quarters
3. **Upload the same transcript to QuantumStock** and analyze
4. **Compare field by field:**

| Field | Manual Reading | QuantumStock Output | Match? |
|-------|---------------|-------------------|--------|
| Quarter detected | Q3FY26 | ? | |
| Revenue reported | ₹929 cr | ? | |
| PAT Growth YoY% | +99% | ? | |
| Tone score | 8/10 (optimistic) | ? | |
| Key highlights | [list] | ? | |
| Guidance: Revenue growth | 50%+ | ? | |
| Guidance: SSSG target | 8-10% | ? | |
| Guidance: Store additions | ~150 | ? | |
| Guidance revision | Maintained from Q2 | ? | |
| Valuation growth rate used | Should use 50%+ | ? | |

### Method 2: Cross-Quarter Consistency

Upload 2-3 consecutive concalls for the same company and verify:

1. **Quarter ordering** — Are they sorted by fiscal quarter (not upload date)?
2. **Guidance tracker** — Do revisions correctly show raised/lowered/maintained?
3. **Trajectory** — Does the guidance_trajectory field match reality?
4. **Contradiction detection** — If management contradicted prior guidance, is it flagged?

**Test case:**
- Upload Q1FY26, Q2FY26, Q3FY26 transcripts (in any order)
- Verify the tracker shows guidance evolution across all 3 quarters
- Check if the system detects revisions correctly (e.g., "25% raised to 30%")

### Method 3: Edge Case Testing

Test these specific scenarios:

| Test Case | What to Upload | Expected Behavior |
|-----------|---------------|-------------------|
| Vague guidance only | Transcript with "high teens growth" | Should infer 15-19%, use midpoint |
| No guidance at all | Transcript where mgmt avoids numbers | System falls back to historical growth |
| Contradictory guidance | Transcript where mgmt says "on track" but numbers show miss | Contradiction flagged |
| Multi-segment guidance | Conglomerate with different business segments | Separate guidance items per segment |
| Time-bound targets | "Double revenue in 3 years" | Should extract CAGR ~26% |
| Absolute targets only | "Revenue target ₹8100 cr FY27" | Valuation calculates implied growth |
| Guidance withdrawal | "We are not giving guidance this quarter" | guidance_type="withdrawn" |

### Method 4: Peer Comparison with Screener.in

For companies available on Screener.in:
1. Read the Screener concall summary
2. Upload the same transcript to QuantumStock
3. Compare key highlights, financial metrics, and guidance items
4. Note any discrepancies

## Accuracy Metrics to Track

### Structured Guidance Extraction

| Metric | How to Measure | Target |
|--------|---------------|--------|
| **Metric detection rate** | Count of guidance items found vs actually present in transcript | >90% |
| **Value accuracy** | Are numeric ranges correct? | 100% (numbers must match exactly) |
| **Revision correctness** | Is raised/lowered/maintained correctly identified? | >85% |
| **Quarter detection** | Is the fiscal quarter correctly identified? | >95% |
| **False positives** | Guidance items that don't exist in transcript | <5% |

### Summary Quality

| Metric | How to Measure | Target |
|--------|---------------|--------|
| **Completeness** | Does summary cover all major topics discussed? | >85% |
| **Quote accuracy** | Are direct quotes exactly as in transcript? | 100% |
| **Number accuracy** | Are financial numbers correct? | 100% |
| **Length** | 1500-3000 words | Within range |

### Valuation Derivation

| Metric | How to Measure | Target |
|--------|---------------|--------|
| **Growth rate source** | Is the right strategy used (not defaulting to 20% when guidance exists)? | 100% |
| **Assumption transparency** | Are all assumptions listed? | 100% |
| **Forward period** | Is the correct fiscal year shown? | 100% |

## Building a Test Suite

### Step 1: Collect Reference Transcripts

Build a test corpus of 10-15 transcripts across:
- Different sectors (IT, Banking, Manufacturing, Consumer, Pharma)
- Different guidance styles (explicit, vague, conditional, absent)
- Different company sizes (large-cap, mid-cap, small-cap)

### Step 2: Create Ground Truth

For each transcript, manually create a ground truth JSON:

```json
{
  "transcript_file": "Company_Q3FY26_Concall.pdf",
  "expected_quarter": "Q3FY26",
  "expected_highlights_keywords": ["revenue growth", "margin expansion", "order book"],
  "expected_guidance": [
    {"metric": "revenue_growth", "value_text": "25-30%", "period": "FY26"},
    {"metric": "pat_margin", "value_text": "12-14%", "period": "FY26"}
  ],
  "expected_tone_range": [7, 9],
  "expected_valuation_growth_min": 25,
  "expected_valuation_growth_max": 30
}
```

### Step 3: Automate Comparison

Write a script that:
1. Analyzes each transcript via the API
2. Compares output against ground truth
3. Reports match percentages

### Step 4: Regression Testing

After any prompt or model change:
1. Re-run the test suite
2. Compare new results with previous baseline
3. Ensure no accuracy regressions

## Common Accuracy Issues and Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Missing guidance items | Prompt not specific enough | Add the metric pattern to `_SYSTEM_PROMPT` standardized keys |
| Wrong revision status | Insufficient previous quarter context | Ensure previous 2 quarters are passed to Gemini |
| Valuation defaults to 20% | Guidance exists but in unexpected format | Add a new strategy to the 7-strategy waterfall |
| Truncated summary | Gemini output too large for token limit | Retry with higher token limit (already implemented) |
| Wrong quarter detection | Ambiguous transcript header | Pass `quarter_hint` from filename parsing |

## Continuous Improvement

1. After every new company analyzed, spot-check 2-3 guidance items against the transcript
2. Log any accuracy issues in a tracking spreadsheet
3. When patterns emerge, update the Gemini system prompt or extraction strategies
4. Re-run the test suite after any model or prompt changes
