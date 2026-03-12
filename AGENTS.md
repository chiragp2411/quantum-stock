# AGENTS.md — QuantumStock AI Agent Guide

This file provides context for AI coding agents working on the QuantumStock codebase.

## Project Overview

QuantumStock is a local-only stock research tool for Indian markets (NSE/BSE). It uses a Peter Lynch-inspired investment framework with a "car race" analogy. All AI analysis runs locally via Ollama + SpaCy — no cloud APIs, no API keys needed.

## LLM Pipeline Architecture (v4 — Hybrid SpaCy-first)

```
PDF Upload
    ↓
pdfplumber (text extraction)
    ↓
SpaCy + regex extraction (ALL structured data, <2 seconds)
    ├→ quarter, highlights, guidance, tone, flags, quotes, lynch category
    ↓
Ollama summary generation (ONLY detailed_summary, ~25 seconds)
    ├→ 600-1000 word markdown research note
    ↓
ConCallAnalysis (Pydantic model) → MongoDB
```

### Key Design Decisions

1. **SpaCy-first, LLM-optional**: SpaCy + regex handles ALL structured extraction (quarter, highlights, guidance, flags, scores, quotes) instantly (<2s). Ollama generates ONLY the detailed markdown summary. If Ollama fails, structured data is still complete.
2. **Speed**: Previous approach used LLM for everything (5-10 min/concall). New approach: SpaCy ~2s + Ollama ~25s = ~27s total per concall.
3. **Sequential worker queue**: Concalls are processed one at a time via `queue.Queue` + single worker thread. Ollama handles one request at a time, so parallel threads just cause contention.
4. **Startup cleanup**: `main.py` resets stuck `analyzing`/`queued` statuses to `pending` on restart, preventing zombie states from crashed workers.
5. **Model choice**: `llama3.2:latest` (3B) is default — 54 tok/s vs 22 tok/s for Mistral 7B. Since it only generates summaries (not structured JSON), the smaller model works well.

### Key Files

| File | Purpose |
|------|---------|
| `backend/app/concalls/llm_analyzer.py` | Hybrid extraction: SpaCy structured + Ollama summary |
| `backend/app/concalls/spacy_preprocessor.py` | SpaCy NER + EntityRuler for financial patterns |
| `backend/app/concalls/pdf_parser.py` | pdfplumber text extraction |
| `backend/app/concalls/models.py` | Pydantic models: `ConCallAnalysis`, `GuidanceRow` |
| `backend/app/concalls/router.py` | API: upload, analyze (queue), delete/clear, tracker, override |
| `backend/app/config.py` | Settings: `ollama_model`, `spacy_model` |
| `backend/app/main.py` | Startup: Ollama/SpaCy checks, stuck analysis reset |

### SpaCy Structured Extraction

The `_extract_structured()` function in `llm_analyzer.py` extracts ALL fields without any LLM call:

- **Quarter**: Regex patterns on SpaCy FY_PERIOD entities and raw text
- **Highlights**: Sentences scored by financial keyword density (percentages, currency, YoY/QoQ, metrics)
- **Guidance**: Sentences near guidance keywords matched to metric categories (revenue, EBITDA, margin, capex, etc.)
- **Tone score**: Positive/negative keyword frequency ratio (1-10 scale)
- **Execution score**: Delivery vs delay keyword ratio
- **Green/red flags**: Sentences with multiple positive or negative financial signals
- **Key quotes**: Quoted text or management first-person statements with numbers
- **Lynch category**: Heuristic from growth %, turnaround/cyclical keywords, dividend mentions

### Ollama Summary

- Model: `llama3.2:latest` (configurable via `OLLAMA_MODEL` in `.env`)
- Input: First 8K chars of transcript
- Output: 600-1000 word markdown research note
- Temperature: 0.3
- `num_predict`: 4096 tokens
- If Ollama fails, analysis completes with empty `detailed_summary` — all structured fields still populated

## Model Recommendation

### Current Default

```
ollama pull llama3.2:latest
```

- **Size**: ~2 GB
- **Speed**: ~54 tok/s on Apple Silicon
- **Use**: Summary generation only (structured extraction is SpaCy-based)

### Alternatives

| Model | Size | Speed | When to Use |
|-------|------|-------|-------------|
| `llama3.2:latest` | 2 GB | 54 tok/s | **Default** — fast, good summaries |
| `mistral:7b-instruct-v0.3-q5_K_M` | 4.8 GB | 22 tok/s | Better quality summaries, 2x slower |
| `gemma2:9b` | 5.4 GB | ~15 tok/s | Best quality, needs more RAM |
| `phi3:mini` | 2.3 GB | ~45 tok/s | Fast alternative |

### Switching Models

1. Pull the new model: `ollama pull <model-name>`
2. Update `OLLAMA_MODEL` in `backend/.env`
3. Restart the backend server

## API Endpoints (Concalls)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/{symbol}/upload` | Upload PDFs |
| POST | `/{symbol}/analyze` | Queue pending for analysis |
| POST | `/{symbol}/reanalyze/{id}` | Re-run single analysis |
| DELETE | `/{symbol}/clear?filter_status=` | Bulk delete (failed/pending/all) |
| DELETE | `/{symbol}/{id}` | Delete single concall |
| GET | `/{symbol}` | List all concalls |
| GET | `/{symbol}/tracker` | Guidance tracker table |
| PUT | `/{symbol}/{id}/override` | Manual override actuals |

## Troubleshooting

### Analysis Takes Too Long

- Default model `llama3.2` should complete in ~25s per concall
- If using Mistral 7B, expect ~60-90s per concall
- SpaCy extraction is always instant (<2s) regardless of model
- Check `backend/.env` → `OLLAMA_MODEL`

### Ollama Connection Issues

```bash
curl http://localhost:11434/api/tags   # Check connectivity
ollama serve                           # Start Ollama
ollama list                            # Check models
ollama pull llama3.2:latest           # Pull default model
```

### SpaCy Model Missing

```bash
cd backend
uv pip install pip
uv run python -m spacy download en_core_web_sm
```

### Stuck "Analyzing" State

The server resets stuck states on startup. If concalls are stuck:
1. Restart the backend: the startup hook resets `analyzing`/`queued` → `pending`
2. Click "Analyze Pending" again in the frontend

### Clear Button Not Working

The clear endpoint uses `DELETE /{symbol}/clear?filter_status=failed|pending|all`. Verify:
- Frontend sends to `/api/concalls/{symbol}/clear` (not `/{symbol}`)
- Uses `onClick` (not `onSelect`) for Base UI `MenuPrimitive.Item`

## Common Modification Patterns

### Adding SpaCy Extraction Logic

Edit `backend/app/concalls/llm_analyzer.py`:
- `_extract_highlights()`: Adjust sentence scoring weights
- `_extract_guidance()`: Add metric patterns to `metric_patterns` list
- `_extract_flags()`: Modify positive/negative keyword sets
- `_score_tone()`: Adjust sentiment word lists

### Adding SpaCy Entity Patterns

Edit `backend/app/concalls/spacy_preprocessor.py` → `_ENTITY_PATTERNS`:
```python
{"label": "YOUR_LABEL", "pattern": [{"LOWER": "your_keyword"}]},
```

### Changing the LLM Summary Prompt

Edit `_SUMMARY_SYSTEM` in `backend/app/concalls/llm_analyzer.py`. This only affects the markdown summary, not structured extraction.

### Adding New Fields to Analysis

1. Add field to `ConCallAnalysis` in `models.py`
2. Add extraction logic to `_extract_structured()` in `llm_analyzer.py`
3. Update frontend display in `analysis-drawer.tsx`

## Documentation Maintenance

**Always update documentation after making changes to the app.**

| Document | What to Update |
|----------|---------------|
| `backend/docs/ai-context.md` | Tech stack, project structure, env vars |
| `backend/docs/architecture.md` | System diagrams, data flows, design decisions |
| `backend/docs/api-contracts.md` | New/changed API endpoints |
| `backend/docs/setup/local-development.md` | Prerequisites, setup, troubleshooting |
| `backend/docs/features/concall-analysis.md` | Pipeline steps, output fields |
| `README.md` | Overview, setup quickstart |
| `AGENTS.md` (this file) | Pipeline architecture, model recs, troubleshooting |

When making changes:
1. After modifying endpoints → update `api-contracts.md`
2. After adding/removing deps → update `ai-context.md` and `pyproject.toml`
3. After changing analysis pipeline → update `features/concall-analysis.md` and `AGENTS.md`
4. After changing env vars → update `setup/local-development.md`
5. After architectural changes → update `architecture.md`
