# AGENTS.md — QuantumStock AI Agent Guide

This file provides context for AI coding agents working on the QuantumStock codebase.

## Agent Role

You are a senior software engineer with deep expertise in AI/LLM integration, Python backend (FastAPI), React/Next.js frontend, and **Indian equity markets investing**. You understand Peter Lynch bottom-up growth investing, con-call-driven research, management guidance tracking, execution accountability, sector-relative positioning, and PEG-based valuation. You think like both an engineer and an equity research analyst.

## Project Overview

QuantumStock is a **"Car Race Dashboard"** — a guidance-driven equity research system for Indian markets (NSE/BSE). Every sector is a race, every stock is a car. The dashboard answers: **"Is this the fastest car at a fair price? Add fuel, hold, or switch?"**

### Core Investing Principles

1. **Peter Lynch bottom-up style** — study the business through management's own words in con-calls
2. **Car Race Analogy** — every sector is a race; pick the car with the strongest engine (moat + guidance), best driver (credible management), and clearest speed (upward trajectory); add fuel when it accelerates, switch cars when it slows
3. **Direction > absolute numbers** — a stock going 10% → 20% → 30% → 50% is exciting; 80% → 50% → 30% is a trap; guidance revisions are the speedometer
4. **Probability mindset** — enter small, add on confirms, exit fast on downward signals
5. **Forward-looking only** — market is a forward engine; never look at old charts or macro reports
6. **Management guidance is truth** — extract, track, verify what management promises every quarter
7. **Execution over promises** — one guidance miss is a warning, two is an exit

### The 4 Stock Phases (Valuation Matrix)

| Phase | Condition | PEG | Trajectory | Action |
|-------|-----------|-----|------------|--------|
| Phase 1: Bargain | Low PE + High Growth | < 1 | Upward | Buy / Add heavily |
| Phase 2: Momentum | High PE + High Growth | ~1 | Still upward | Hold, watch closely |
| Phase 3: Trap | High PE + Low Growth | > 1 | Downward | Exit fast |
| Phase 4: Turnaround | Low PE + Low Growth | < 1 | Flat/starting up | Track for Phase 1 shift |

**Critical**: Phase classification MUST include trajectory (guidance direction), not just PEG and growth rate.

### Key Formulas

```
PEG = Forward P/E ÷ PAT Growth (%)
Forward P/E = Current Market Cap ÷ Forward PAT
PAT Growth (%) = (Forward PAT − Trailing PAT) ÷ Trailing PAT × 100
```

### The 8-Section Practical Checklist

Every stock analysis covers:

1. **Sector Snapshot** — aggregate 3-5 peers' con-calls; sector tailwind or headwind?
2. **Business Model & Moat** — products, customers, pricing power, expansion metrics
3. **Management & Ownership** — promoter stake, insider buying, guidance hit-rate
4. **Financial Performance** — forward-lens revenue/PAT growth, margins, ROE/ROCE, debt
5. **Con-Call Deep Dive & Guidance Tracker** — THE HEART; tone (1-10), trajectory chart, contradiction detector, surprise column
6. **Peer Comparison** — sector race leaderboard; which car is fastest at best price?
7. **Forward Valuation & Scenarios** — base/bull/bear with exact table: Forward PE, PAT Growth, PEG, Upside, PE re-rating potential
8. **Investment Decision & Portfolio Fit** — 3-point thesis (why buy, risks, switch trigger) + session notebook

See `backend/docs/gemini-migration-plan.md` for the full roadmap of what's built vs. planned.

## Current Architecture

### Analysis Pipeline (v6 — Structured Guidance + Gemini)

```
PDF Upload
  ↓
pdfplumber (text extraction)
  ↓
ANALYSIS_PROVIDER check
  ├── "gemini" → Gemini 2.5 Flash structured output (single call, ~10-15s)
  │   ├→ ALL fields: summary, highlights, tone, business model, moat,
  │   │   financials, trajectory, contradictions, thesis, capex
  │   └→ structured_guidance: list[GuidanceItem] — every forward statement
  │       with metric key, numeric range, revision status, evidence quote
  │
  └── "ollama" (fallback) → SpaCy + regex (<2s) + Ollama summary (~25s)
      └→ Structured data from SpaCy, summary from Ollama
  ↓
ConCallAnalysis (Pydantic model, 30+ fields) → MongoDB
```

### Structured Guidance System (THE HEART)

Every forward-looking management statement is extracted as a `GuidanceItem` with:
- **Standardized metric key** (revenue_growth, pat_growth, ebitda, etc.) for cross-quarter comparison
- **Numeric range** (value_low, value_high) — even vague language like "high teens" is mapped to 15-19%
- **Revision status** (new / raised / maintained / lowered / withdrawn) vs previous quarter
- **Evidence quote** — exact management text supporting the guidance
- **Conditions** ("if monsoon is normal") and **segment** ("Retail", "Dubai") when applicable
- Handles all 15 real-world guidance cases (explicit, vague, conditional, implicit, withdrawal, contradiction, etc.)

This structured data powers:
- **Tracker table** — categorized display (Growth / Profitability / Operations) instead of chaotic tags
- **Valuation auto-fill** — direct numeric values instead of regex parsing
- **Trajectory calculation** — per-metric comparison across quarters
- **Cross-quarter context** — previous 2 quarters sent to Gemini for revision detection

### Key Design Decision: Gemini vs Ollama

| Aspect | Gemini 2.5 Flash | Ollama + SpaCy |
|--------|-----------------|----------------|
| Quality | Financial comprehension, structured JSON | Keyword matching, regex |
| Speed | ~10-15s per concall | ~27s (SpaCy 2s + Ollama 25s) |
| Cost | ~$0.01 per concall | Free (local) |
| Fields | 30+ (business model, thesis, contradictions, financials) | ~12 (basic extraction) |
| Cross-quarter | Detects contradictions, tracks trajectory | Basic tone comparison |

### Key Files

| File | Purpose |
|------|---------|
| `backend/app/concalls/gemini_analyzer.py` | **NEW**: Gemini structured output analyzer (single call) |
| `backend/app/concalls/llm_analyzer.py` | Ollama fallback: SpaCy structured + Ollama summary |
| `backend/app/concalls/spacy_preprocessor.py` | SpaCy NER + EntityRuler for financial patterns |
| `backend/app/concalls/pdf_parser.py` | pdfplumber text extraction |
| `backend/app/concalls/models.py` | Pydantic models: `ConCallAnalysis`, `GuidanceItem` (structured), `GuidanceRow` |
| `backend/app/concalls/router.py` | API: upload, analyze (queue), delete/clear, tracker, override |
| `backend/app/stocks/router.py` | Stock search, recent, summary, dashboard-stats |
| `backend/app/valuation/calculator.py` | 4-phase valuation matrix, scenario math |
| `backend/app/valuation/router.py` | Valuation API + guidance-prefill endpoint |
| `backend/app/notes/router.py` | Session Notebook: CRUD for per-stock investment notes |
| `backend/app/config.py` | Settings from `.env` (root or backend dir) |
| `backend/app/main.py` | Startup: Gemini/Ollama/SpaCy checks, stuck analysis reset |
| `backend/docs/gemini-migration-plan.md` | Full system vision and migration roadmap |

### Frontend Pages

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Redirects to /dashboard | No |
| `/login` | Login page (redirects to /dashboard if logged in) | No |
| `/signup` | Signup page (redirects to /dashboard if logged in) | No |
| `/dashboard` | Command center: stats, search, quick actions, recent activity | No (public) |
| `/explore` | Browse all tracked stocks: filter, sort, compare | No (public) |
| `/stock/[symbol]` | Stock overview: metrics, growth classification, navigation | No (public) |
| `/stock/[symbol]/concalls` | Con-call analysis: view tracker, view analysis. Upload/analyze requires login | View: No, Actions: Yes |
| `/stock/[symbol]/valuation` | Forward valuation: scenarios, phase speedometer | No (public) |

### Auth Strategy

- **Public (no login)**: All read/view operations — dashboard, explore, stock pages, analysis results, tracker, valuation results
- **Protected (login required)**: All write/LLM operations — stock search (writes to DB), PDF upload, analyze, reanalyze, delete, clear, calculate valuation, manual override
- **Roles**: `admin` (seeded via `seed.py`) and `user` (created via signup). Normal users can currently access everything when logged in; role-based restrictions planned for future phases
- **Logged-in redirect**: Login/signup pages redirect to `/dashboard` if user is already authenticated

## Environment & Config

The backend reads `.env` from `backend/.env` if it exists, otherwise from the project root `.env`.

Key variables:
- `ANALYSIS_PROVIDER=gemini` — "gemini" (default) or "ollama" (fallback)
- `GEMINI_API_KEY` — your Gemini API key (required when provider=gemini)
- `GEMINI_MODEL=gemini-2.5-flash` — Gemini model to use
- `OLLAMA_MODEL=llama3.2:latest` — Ollama model (used when provider=ollama)
- `JWT_SECRET` — set this for persistent sessions across restarts
- `ADMIN_PASS` — password for the seeded admin user

## API Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/health` | Health check | No |
| POST | `/api/auth/signup` | Create account (role=user) | No |
| POST | `/api/auth/login` | Login, get JWT + role | No |
| GET | `/api/stocks/search?q=` | Search & fetch stock (writes DB) | **Yes** |
| GET | `/api/stocks/recent` | Recent stocks | No |
| GET | `/api/stocks/{symbol}/summary` | Stock summary | No |
| GET | `/api/stocks/dashboard-stats` | Dashboard aggregates | No |
| POST | `/api/concalls/{symbol}/upload` | Upload PDFs | **Yes** |
| POST | `/api/concalls/{symbol}/analyze` | Queue for analysis | **Yes** |
| POST | `/api/concalls/{symbol}/reanalyze/{id}` | Re-analyze one | **Yes** |
| GET | `/api/concalls/{symbol}` | List concalls | No |
| GET | `/api/concalls/{symbol}/tracker` | Guidance tracker | No |
| PUT | `/api/concalls/{symbol}/{id}/override` | Manual override | **Yes** |
| DELETE | `/api/concalls/{symbol}/{id}` | Delete one | **Yes** |
| DELETE | `/api/concalls/{symbol}/clear` | Bulk delete | **Yes** |
| POST | `/api/valuation/{symbol}/calculate` | Run scenarios | **Yes** |
| GET | `/api/valuation/{symbol}/latest` | Latest valuation | No |
| GET | `/api/valuation/{symbol}/guidance-prefill` | Growth rate from guidance | No |
| GET | `/api/notes/{symbol}` | List stock notes | No |
| POST | `/api/notes/{symbol}` | Create note | **Yes** |
| PUT | `/api/notes/{symbol}/{id}` | Update note | **Yes** |
| DELETE | `/api/notes/{symbol}/{id}` | Delete note | **Yes** |
| GET | `/api/news/{symbol}` | News (stub) | No |

## Troubleshooting

### Analysis Takes Too Long
- **Gemini**: ~10-15s per concall (structured output, single call)
- **Ollama**: ~25s per concall (SpaCy 2s + Ollama 25s)
- Concalls process sequentially via background worker queue

### Gemini Not Working
- Check `GEMINI_API_KEY` is set in `.env`
- Check `ANALYSIS_PROVIDER=gemini` in `.env`
- Verify key at https://aistudio.google.com/apikey
- Backend health endpoint shows `gemini_connected: true/false`

### Ollama Connection Issues
```bash
curl http://localhost:11434/api/tags
ollama serve
ollama pull llama3.2:latest
```

### SpaCy Model Missing
```bash
cd backend
uv pip install pip
uv run python -m spacy download en_core_web_sm
```

### Stuck "Analyzing" State
Restart the backend — startup hook resets `analyzing`/`queued` → `pending`.

### .env Not Loading
Config checks `backend/.env` first, falls back to root `.env`. Ensure at least one exists.

## Common Modification Patterns

### Adding New Analysis Fields
1. Add field to `ConCallAnalysis` in `models.py`
2. Add field to `_GeminiAnalysisSchema` in `gemini_analyzer.py`
3. Add extraction logic in `llm_analyzer.py` (for Ollama fallback)
4. Update frontend display in `analysis-drawer.tsx`

### Adding New API Endpoints
1. Add route in the appropriate `router.py`
2. Update `api-contracts.md`
3. Update this file's endpoint table

### Frontend: Adding a New Page
1. Create `frontend/src/app/your-route/page.tsx`
2. Add nav link in `header.tsx` if needed
3. Wrap with `<AuthGuard>` and `<Header />`

## Documentation Maintenance

**Always update documentation after making changes.**

| Document | What to Update |
|----------|---------------|
| `backend/docs/ai-context.md` | Tech stack, project structure, env vars |
| `backend/docs/architecture.md` | System diagrams, data flows, design decisions |
| `backend/docs/api-contracts.md` | New/changed API endpoints |
| `backend/docs/setup/local-development.md` | Prerequisites, setup, troubleshooting |
| `backend/docs/features/concall-analysis.md` | Pipeline steps, output fields |
| `backend/docs/gemini-migration-plan.md` | System vision, migration roadmap |
| `README.md` | Overview, setup quickstart |
| `AGENTS.md` (this file) | Architecture, endpoints, troubleshooting |

Trigger rules:
1. After modifying endpoints → update `api-contracts.md` + this file
2. After adding/removing deps → update `ai-context.md` and `pyproject.toml`
3. After changing analysis pipeline → update `features/concall-analysis.md` + this file
4. After changing env vars → update `setup/local-development.md`
5. After architectural changes → update `architecture.md`
6. After changing system vision → update `gemini-migration-plan.md`
