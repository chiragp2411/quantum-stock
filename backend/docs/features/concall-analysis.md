# Feature: Con-Call Analysis Pipeline

## Overview

The con-call analysis feature allows users to upload earnings conference call transcripts (PDFs), extract text, and run AI-powered analysis using a hybrid SpaCy + Ollama pipeline. SpaCy + regex handles ALL structured extraction instantly (<2 seconds), while Ollama generates only the detailed markdown summary (~25 seconds). This "SpaCy-first, LLM-optional" architecture ensures fast, reliable analysis even if Ollama is unavailable.

## Pipeline Steps

```
Upload PDFs → Store in GridFS → Extract text (pdfplumber) →
SpaCy + regex extraction (ALL structured data, <2s) →
Ollama summary (detailed markdown only, ~25s) →
ConCallAnalysis → MongoDB
```

### Step 1: Upload (POST /api/concalls/{symbol}/upload)

- User uploads 1-8 PDF files via multipart form
- Each PDF validated (must end in `.pdf`)
- Binary content stored in **GridFS** (`fs.files` + `fs.chunks`)
- Text extracted using **pdfplumber** page by page
- Quarter guessed from filename patterns
- Document inserted into `concalls` collection with `status: "pending"`

**Files:** `app/concalls/router.py` → `upload_concall_pdfs()`

### Step 2: Text Extraction (pdfplumber)

- `extract_text_from_pdf(pdf_bytes)` opens PDF from raw bytes
- Iterates all pages, extracting text
- Returns concatenated text or empty string on failure

**Files:** `app/concalls/pdf_parser.py`

### Step 3: SpaCy Pre-processing

- SpaCy model (`en_core_web_sm`) loaded with custom EntityRuler
- **EntityRuler patterns**: FY periods, guidance keywords, store metrics
- **Regex matchers**: Percentages, Indian currency, growth phrases
- Output: List of `{text, label, sentence, context}` dicts
- Used by structured extraction functions for entity-aware analysis

**Files:** `app/concalls/spacy_preprocessor.py`

### Step 4: SpaCy Structured Extraction (instant, <2s)

All structured fields are extracted WITHOUT any LLM call:

| Field | Method |
|-------|--------|
| `quarter` | SpaCy FY_PERIOD entities + regex on text |
| `highlights` | Sentence scoring by financial keyword density (%, ₹, metrics, YoY) |
| `guidance` | Sentences near guidance keywords, matched to metric categories |
| `tone_score` | Positive/negative keyword frequency ratio (1-10) |
| `management_execution_score` | Delivery vs delay keyword ratio (1-10) |
| `green_flags` | Sentences with multiple positive financial signals |
| `red_flags` | Sentences with multiple negative financial signals |
| `key_quotes` | Quoted text or management first-person statements |
| `lynch_category` | Heuristic from growth %, turnaround/cyclical keywords |
| `confidence` | Fixed at 0.7 for SpaCy extraction |

**Files:** `app/concalls/llm_analyzer.py` → `_extract_structured()`

### Step 5: Ollama Summary Generation (~25s)

- Model: `llama3.2:latest` (configurable via `OLLAMA_MODEL`)
- Input: First 8K chars of transcript
- Prompt: Expert equity research analyst, write 600-1000 word markdown analysis
- Temperature: 0.3, `num_predict`: 4096
- If Ollama fails, analysis completes with empty `detailed_summary`

**Files:** `app/concalls/llm_analyzer.py` → `_generate_summary()`

### Step 6: Background Processing

- Analysis runs in a sequential worker thread (one concall at a time)
- `queue.Queue` ensures Ollama calls don't overlap
- Status lifecycle: `pending` → `queued` → `analyzing` → `completed`/`failed`
- Frontend polls every 4 seconds for status updates

**Files:** `app/concalls/router.py` → `_analysis_worker()`, `_ensure_worker()`

### Step 7: Startup Cleanup

- On server restart, stuck `analyzing`/`queued` statuses reset to `pending`
- Prevents zombie states from crashed worker threads

**Files:** `app/main.py` → `_reset_stuck_analyses()`

## Output Schema (ConCallAnalysis)

| Field | Type | Description |
|-------|------|-------------|
| `quarter` | str | e.g. "Q3FY26" |
| `detailed_summary` | str | 600-1000 word markdown research note |
| `highlights` | list[str] | 8-12 quantitative takeaways |
| `tone_score` | int (1-10) | Management sentiment |
| `guidance` | dict[str, str] | Forward guidance by metric |
| `green_flags` | list[str] | Positive signals |
| `red_flags` | list[str] | Warning signals |
| `management_execution_score` | int (1-10) | Past-promise delivery |
| `key_quotes` | list[str] | Direct management quotes |
| `lynch_category` | str | Peter Lynch classification |
| `confidence` | float (0-1) | Extraction confidence |
| `error` | str | Error message if failed |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/{symbol}/upload` | Upload PDF transcripts |
| POST | `/{symbol}/analyze` | Queue pending for analysis |
| POST | `/{symbol}/reanalyze/{id}` | Re-run single analysis |
| DELETE | `/{symbol}/clear?filter_status=` | Bulk delete (failed/pending/all) |
| DELETE | `/{symbol}/{id}` | Delete single concall |
| GET | `/{symbol}` | List all concalls |
| GET | `/{symbol}/tracker` | Guidance tracker table |
| PUT | `/{symbol}/{id}/override` | Manual override actuals |

## Performance

| Metric | Value |
|--------|-------|
| SpaCy extraction | <2 seconds |
| Ollama summary (llama3.2) | ~25 seconds |
| Total per concall | ~27 seconds |
| Multiple concalls | Sequential (N × 27s) |

## Related Files

| File | Role |
|------|------|
| `frontend/src/app/stock/[symbol]/concalls/page.tsx` | Main concalls page with polling |
| `frontend/src/components/concalls/analysis-card.tsx` | Per-concall status and summary card |
| `frontend/src/components/concalls/analysis-drawer.tsx` | Detailed analysis in side drawer |
| `frontend/src/components/concalls/tracker-table.tsx` | Guidance tracker table |
| `frontend/src/components/concalls/pdf-dropzone.tsx` | PDF upload dropzone |
