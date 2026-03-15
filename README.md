# QuantumStock

Personal equity research tool for Indian markets (NSE/BSE) — a "car race dashboard" for guidance-driven investing. Analyze earnings calls, track management guidance, detect contradictions, and find the fastest-growing stocks at fair valuations. Powered by **Gemini 2.5 Flash** (structured output) with Ollama as a free local fallback.

## What It Does

- **Stock Search & Classification**: Search any NSE/BSE stock. Automatically classified into Lynch categories (Fast Grower, Stalwart, Cyclical, etc.)
- **Con-Call Deep Dive**: Drag-and-drop up to 8 quarterly con-call PDFs. AI (Gemini or Ollama) extracts highlights, tone, business model, moat signals, guidance, trajectory, contradictions, investment thesis, capex plans, and management execution scores.
- **Guidance Tracker**: Table comparing management guidance vs actuals across quarters. Manual override when yfinance data is unavailable.
- **Forward Valuation**: Base/Bull/Bear scenario analysis with Forward PE, PEG, Fair Value, and Upside calculations.
- **Phase Speedometer**: Visual indicator showing which of 4 valuation phases a stock is in (Bargain, Momentum, Trap, Turnaround).

## Tech Stack

| Layer       | Technology                                                |
|-------------|-----------------------------------------------------------|
| Backend     | Python 3.12, FastAPI, pymongo                             |
| Frontend    | Next.js 16, React, Shadcn UI, Tailwind CSS, Chart.js     |
| Database    | MongoDB 6+ (local)                                       |
| LLM (Primary) | Google Gemini 2.5 Flash — structured output, ~$0.01/concall |
| LLM (Fallback) | Ollama (llama3.2:latest 3B) — fully local, free |
| NLP         | SpaCy (`en_core_web_sm`) — used by Ollama fallback |
| PDF Parse   | pdfplumber                                                |
| Market Data | yfinance                                                  |
| Auth        | bcrypt + JWT                                              |
| Pkg Mgmt    | uv (backend), npm (frontend)                             |

## Prerequisites

- Python 3.12+
- Node.js 20+
- MongoDB 6+ running locally on `localhost:27017`
- [Ollama](https://ollama.com) installed and running
- [uv](https://docs.astral.sh/uv/) for Python package management

## Setup

### 1. Clone and configure environment

```bash
cd quantum-stock
cp .env.example .env
```

The default `.env` works out of the box for local development. Key settings:

```
ANALYSIS_PROVIDER=gemini          # "gemini" or "ollama"
GEMINI_API_KEY=your-key-here      # Get from https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash     # Recommended model
OLLAMA_MODEL=llama3.2:latest      # Fallback model
JWT_SECRET=any-random-secret-string
ADMIN_PASS=your-admin-password
```

### 2. Install and start Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Start the Ollama server
ollama serve

# Pull the default model (~2 GB)
ollama pull llama3.2:latest
```

Verify it works: `ollama list` should show the model.

### 3. Start MongoDB

```bash
# If installed via Homebrew
brew services start mongodb-community

# Or run directly
mongod --dbpath /path/to/data/db
```

### 4. Backend setup

```bash
cd backend

# Install dependencies (uv handles virtualenv automatically)
uv sync

# Download the SpaCy model
uv run python -m spacy download en_core_web_sm

# Seed the admin user
uv run python seed.py

# Start the API server
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Check `http://localhost:8000/docs` for the Swagger UI.

### 5. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### 6. Login

Use the admin account seeded in step 4:
- Username: `chiragp`
- Password: whatever you set as `ADMIN_PASS` in `.env`

## How the AI Pipeline Works (v4 — Hybrid SpaCy-first)

```
PDF Upload → pdfplumber (text extraction)
                ↓
         SpaCy + regex extraction (ALL structured data, <2s)
         ├→ quarter, highlights, guidance, tone, flags, quotes, lynch category
                ↓
         Ollama summary generation (ONLY detailed_summary, ~25s)
         ├→ 600-1000 word markdown research note
                ↓
         ConCallAnalysis (Pydantic model) → MongoDB
```

SpaCy + regex handles ALL structured extraction (highlights, guidance, flags, scores, quotes, Lynch category) instantly (<2 seconds). Ollama generates ONLY the detailed markdown summary (~25 seconds). If Ollama fails, structured data is still complete — the analysis completes with an empty summary. This "SpaCy-first, LLM-optional" approach is 10-15x faster than the previous all-LLM pipeline.

## Usage Flow

1. **Login** at `http://localhost:3000`
2. **Search** for a stock symbol (e.g., `RELIANCE`, `TCS`, `INFY`)
3. **Stock Overview**: See key metrics, Lynch category, and links to deep-dive tools
4. **Con-Call Deep Dive**: Upload quarterly earnings call transcripts (PDF) and let AI analyze them
5. **Forward Valuation**: Set growth assumptions and run base/bull/bear scenarios

## Project Structure

```
quantum-stock/
├── backend/                   # FastAPI backend
│   ├── app/
│   │   ├── main.py            # App entry point
│   │   ├── config.py          # Environment config
│   │   ├── database.py        # MongoDB connection
│   │   ├── auth/              # Authentication (JWT + bcrypt)
│   │   ├── stocks/            # Stock search, yfinance, Lynch classification
│   │   ├── concalls/          # PDF upload, Ollama+SpaCy analysis, tracker
│   │   │   ├── llm_analyzer.py       # Hybrid SpaCy extraction + Ollama summary
│   │   │   ├── spacy_preprocessor.py # SpaCy NER + financial EntityRuler
│   │   │   ├── pdf_parser.py         # pdfplumber text extraction
│   │   │   ├── models.py             # Pydantic models
│   │   │   └── router.py             # API endpoints
│   │   ├── valuation/         # Scenario calculator
│   │   └── news/              # News stub
│   └── seed.py                # Admin user seeder
├── frontend/                  # Next.js frontend
│   └── src/
│       ├── app/               # Pages (login, dashboard, stock/[symbol]/*)
│       ├── components/        # UI components (Shadcn + custom)
│       ├── hooks/             # React hooks (useAuth, useStock)
│       └── lib/               # API client, constants, utilities
├── .env.example
├── AGENTS.md                  # AI agent guide
└── README.md
```

## Switching Models

The default model is `llama3.2:latest` (3B, ~2 GB, ~54 tok/s on Apple Silicon). You can switch to any Ollama-compatible model by updating `OLLAMA_MODEL` in `.env`:

| Model | Size | Speed | When to Use |
|-------|------|-------|-------------|
| `llama3.2:latest` | 2 GB | 54 tok/s | **Default** — fast, good summaries |
| `mistral:7b-instruct-v0.3-q5_K_M` | 4.8 GB | 22 tok/s | Better quality summaries, 2x slower |
| `gemma2:9b` | 5.4 GB | ~15 tok/s | Best quality, needs more RAM |
| `phi3:mini` | 2.3 GB | ~45 tok/s | Fast alternative |

After changing, pull the new model: `ollama pull <model-name>` and restart the backend.

## API Endpoints

| Method | Endpoint                                        | Description |
|--------|-------------------------------------------------|-------------|
| GET    | `/api/health`                                   | Health check (Ollama/SpaCy status) |
| POST   | `/api/auth/signup`                              | Create account |
| POST   | `/api/auth/login`                               | Login, get JWT |
| GET    | `/api/stocks/search?q=SYMBOL`                   | Search & fetch stock data |
| GET    | `/api/stocks/recent`                            | Recent analyses |
| GET    | `/api/stocks/{symbol}/summary`                  | Stock summary with stats |
| POST   | `/api/concalls/{symbol}/upload`                 | Upload con-call PDFs |
| POST   | `/api/concalls/{symbol}/analyze`                | Queue pending for analysis |
| POST   | `/api/concalls/{symbol}/reanalyze/{id}`         | Re-run single analysis |
| GET    | `/api/concalls/{symbol}`                        | List all concalls |
| GET    | `/api/concalls/{symbol}/tracker`                | Guidance tracker data |
| PUT    | `/api/concalls/{symbol}/{id}/override`          | Manual override actuals |
| DELETE | `/api/concalls/{symbol}/{id}`                   | Delete single concall |
| DELETE | `/api/concalls/{symbol}/clear?filter_status=`   | Bulk delete by status |
| POST   | `/api/valuation/{symbol}/calculate`             | Run scenario analysis |
| GET    | `/api/valuation/{symbol}/latest`                | Latest valuation |
| GET    | `/api/news/{symbol}`                            | News (stub) |
