# QuantumStock

Personal equity research tool for Indian markets (NSE/BSE), powered by Peter Lynch's bottom-up investing framework and a "car race" analogy. All analysis runs **locally** via Ollama + SpaCy — no cloud API keys, no rate limits, no costs.

## What It Does

- **Stock Search & Classification**: Search any NSE/BSE stock. Automatically classified into Lynch categories (Fast Grower, Stalwart, Cyclical, etc.)
- **Con-Call Deep Dive**: Drag-and-drop up to 8 quarterly con-call PDFs. Local AI (Ollama + SpaCy) extracts highlights, tone, guidance, green/red flags, and management execution scores.
- **Guidance Tracker**: Table comparing management guidance vs actuals across quarters. Manual override when yfinance data is unavailable.
- **Forward Valuation**: Base/Bull/Bear scenario analysis with Forward PE, PEG, Fair Value, and Upside calculations.
- **Phase Speedometer**: Visual indicator showing which of 4 valuation phases a stock is in (Bargain, Momentum, Trap, Turnaround).

## Tech Stack

| Layer       | Technology                                                |
|-------------|-----------------------------------------------------------|
| Backend     | Python 3.12, FastAPI, pymongo                             |
| Frontend    | Next.js 16, React, Shadcn UI, Tailwind CSS, Chart.js     |
| Database    | MongoDB 6+ (local)                                       |
| LLM         | Ollama (Mistral 7B) — fully local, no API key needed     |
| NLP         | SpaCy (`en_core_web_sm`) — financial entity pre-processing|
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

The default `.env` works out of the box for local development. Edit if you need to change ports or models:

```
OLLAMA_MODEL=mistral:7b-instruct-v0.3-q5_K_M
OLLAMA_BASE_URL=http://localhost:11434
SPACY_MODEL=en_core_web_sm
JWT_SECRET=any-random-secret-string
ADMIN_PASS=your-admin-password
```

### 2. Install and start Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Start the Ollama server
ollama serve

# Pull the recommended model (~4.8 GB)
ollama pull mistral:7b-instruct-v0.3-q5_K_M
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
cp ../.env .env

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

## How the AI Pipeline Works

```
PDF Upload → pdfplumber (text extraction)
                ↓
         SpaCy NER + EntityRuler
         (financial entity pre-processing: %, ₹, guidance phrases, FY periods)
                ↓
         Ollama Pass 1: Facts Extraction
         (structured JSON: guidance items, tone, flags, scores)
                ↓
         Ollama Pass 2: Interpretation
         (trajectory, Lynch category, contradictions)
                ↓
         ConCallAnalysis stored in MongoDB
```

SpaCy pre-processing boosts accuracy by 10-20% by identifying financial entities (percentages, currency amounts, guidance phrases, fiscal periods) before sending to the LLM. The two-pass approach separates fact extraction from interpretation for more reliable results.

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
│   │   │   ├── llm_analyzer.py       # Two-pass Ollama pipeline
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

You can use any Ollama-compatible model. Update `OLLAMA_MODEL` in `.env`:

```bash
# Better accuracy (needs more RAM/VRAM)
OLLAMA_MODEL=gemma2:9b

# Faster, lighter
OLLAMA_MODEL=phi3:mini

# Best accuracy (needs GPU with 16GB+ VRAM)
OLLAMA_MODEL=mixtral:8x7b
```

After changing, pull the new model: `ollama pull <model-name>`

## API Endpoints

| Method | Endpoint                              | Description |
|--------|---------------------------------------|-------------|
| POST   | `/api/auth/signup`                    | Create account |
| POST   | `/api/auth/login`                     | Login, get JWT |
| GET    | `/api/stocks/search?q=SYMBOL`         | Search & fetch stock data |
| GET    | `/api/stocks/recent`                  | Recent analyses |
| GET    | `/api/stocks/{symbol}/summary`        | Stock summary with stats |
| POST   | `/api/concalls/{symbol}/upload`       | Upload con-call PDFs |
| POST   | `/api/concalls/{symbol}/analyze`      | Run AI analysis |
| GET    | `/api/concalls/{symbol}/tracker`      | Guidance tracker data |
| PUT    | `/api/concalls/{symbol}/{id}/override`| Manual override actuals |
| POST   | `/api/valuation/{symbol}/calculate`   | Run scenario analysis |
| GET    | `/api/valuation/{symbol}/latest`      | Latest valuation |
| GET    | `/api/news/{symbol}`                  | News (stub) |
