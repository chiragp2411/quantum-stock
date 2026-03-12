# QuantumStock — API Contracts

Base URL: `http://localhost:8000`

All endpoints except `/api/auth/*` and `/api/health` require a JWT token in the `Authorization: Bearer <token>` header.

## Authentication

### POST /api/auth/signup

Create a new user account and return a JWT token.

**Request:**
```json
{
  "username": "chiragp",
  "password": "mypassword"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "chiragp"
}
```

**Errors:**
- `409`: `{"detail": "Invalid username or password"}` (username already exists)

---

### POST /api/auth/login

Authenticate with credentials and return a JWT token.

**Request:**
```json
{
  "username": "chiragp",
  "password": "mypassword"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "chiragp"
}
```

**Errors:**
- `401`: `{"detail": "Invalid username or password"}`

---

## Health

### GET /api/health

**Response (200):**
```json
{
  "status": "ok",
  "app": "QuantumStock",
  "ollama_connected": true,
  "ollama_model": "mistral:7b-instruct-v0.3-q5_K_M",
  "spacy_loaded": true,
  "spacy_model": "en_core_web_sm"
}
```

---

## Stocks

### GET /api/stocks/search?q={query}

Search for a stock by symbol. Validates the symbol (adds `.NS` suffix if missing), fetches from yfinance, caches in DB, and returns stock info.

**Query Parameters:**
- `q` (required): Stock symbol (e.g., `V2RETAIL`, `RELIANCE.NS`, `TCS.BO`)

**Response (200):**
```json
{
  "symbol": "V2RETAIL.NS",
  "name": "V2 Retail Limited",
  "exchange": "NSE",
  "sector": "Consumer Cyclical",
  "industry": "Specialty Retail",
  "market_cap": 5234.12,
  "current_price": 1250.5,
  "pe_ratio": 45.2,
  "eps": 27.66,
  "eps_growth": 35.4,
  "dividend_yield": 0.5,
  "week_52_high": 1500.0,
  "week_52_low": 800.0,
  "lynch_category": "Fast Grower"
}
```

**Errors:**
- `404`: Could not fetch data for the given symbol

---

### GET /api/stocks/recent

Return the 10 most recently viewed/searched stocks.

**Response (200):**
```json
[
  {
    "_id": "665...",
    "symbol": "V2RETAIL.NS",
    "name": "V2 Retail Limited",
    "concall_count": 4,
    "latest_phase": "Phase 1: Bargain (Low PE / High Growth)",
    ...
  }
]
```

---

### GET /api/stocks/{symbol}/summary

Return stored stock info with concall and valuation statistics.

**Response (200):**
```json
{
  "stock": {
    "_id": "665...",
    "symbol": "V2RETAIL.NS",
    "name": "V2 Retail Limited",
    ...
  },
  "concall_count": 4,
  "latest_valuation": {
    "_id": "665...",
    "stock_symbol": "V2RETAIL.NS",
    "phase": "Phase 1: Bargain (Low PE / High Growth)",
    "peg": 0.85,
    ...
  }
}
```

**Errors:**
- `404`: Stock not found in database

---

## Con-Calls

### POST /api/concalls/{symbol}/upload

Upload 1-8 PDF con-call transcripts. Files are stored in GridFS and text is extracted with pdfplumber.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `files`: One or more PDF files (max 8)

**Response (200):**
```json
{
  "symbol": "V2RETAIL.NS",
  "uploads": [
    {
      "id": "665abc...",
      "filename": "V2Retail-Q3FY25-Transcript.pdf",
      "quarter": "Q3FY25",
      "text_length": 45000,
      "status": "uploaded"
    },
    {
      "filename": "bad-file.txt",
      "error": "Not a PDF file"
    }
  ]
}
```

**Errors:**
- `400`: Maximum 8 files allowed per upload

---

### POST /api/concalls/{symbol}/analyze

Run local AI analysis (Ollama + SpaCy) on uploaded con-calls. Analyzes all un-analyzed ones if no IDs provided.

**Request (optional body):**
```json
{
  "concall_ids": ["665abc...", "665def..."]
}
```

**Response (200):**
```json
{
  "symbol": "V2RETAIL.NS",
  "results": [
    {
      "id": "665abc...",
      "quarter": "Q3FY25",
      "status": "analyzed",
      "analysis": {
        "quarter": "Q3FY25",
        "highlights": ["Revenue grew 45% YoY to ₹850 Cr", "..."],
        "tone_score": 8,
        "guidance": {
          "revenue_growth": "40-45% for FY25",
          "store_additions": "50-60 new stores"
        },
        "green_flags": ["Margin expansion to 8.5%", "..."],
        "red_flags": ["Working capital pressure", "..."],
        "management_execution_score": 7,
        "key_quotes": ["We are confident of maintaining this growth trajectory"],
        "error": null
      }
    }
  ]
}
```

**Errors:**
- `404`: No con-calls to analyze

---

### POST /api/concalls/{symbol}/reanalyze/{concall_id}

Re-run local AI analysis on a specific con-call.

**Response (200):**
```json
{
  "id": "665abc...",
  "quarter": "Q3FY25",
  "status": "analyzed",
  "analysis": { ... },
  "error": null
}
```

**Errors:**
- `404`: Con-call not found

---

### DELETE /api/concalls/{symbol}/{concall_id}

Delete a single con-call and its associated PDF.

**Response (200):**
```json
{
  "status": "deleted",
  "id": "665abc..."
}
```

**Errors:**
- `404`: Con-call not found

---

### DELETE /api/concalls/{symbol}/clear?filter_status={status}

Delete concalls for a stock with optional status filter.

**Query Parameters:**
- `filter_status` (optional): `"failed"`, `"pending"`, or `"all"` (default: all)

**Response (200):**
```json
{
  "status": "deleted",
  "count": 4
}
```

---

### GET /api/concalls/{symbol}

List all con-calls for a stock, ordered by upload date.

**Response (200):**
```json
[
  {
    "_id": "665abc...",
    "stock_symbol": "V2RETAIL.NS",
    "quarter": "Q3FY25",
    "pdf_file_id": "665...",
    "pdf_filename": "V2Retail-Q3FY25.pdf",
    "raw_text": "...",
    "analysis": { ... },
    "uploaded_at": "2025-01-15T10:30:00Z",
    "uploaded_by": "chiragp",
    "analyzed_at": "2025-01-15T10:31:00Z"
  }
]
```

---

### GET /api/concalls/{symbol}/tracker

Build the guidance tracker table: for each analyzed quarter, compares previous quarter's guidance against actual results.

**Response (200):**
```json
{
  "symbol": "V2RETAIL.NS",
  "tracker": [
    {
      "period": "Q2FY25",
      "tone_score": 7,
      "prev_guidance": {},
      "actuals": {},
      "met_missed": "pending",
      "new_guidance": {"revenue_growth": "40-45%"},
      "trajectory": "flat"
    },
    {
      "period": "Q3FY25",
      "tone_score": 8,
      "prev_guidance": {"revenue_growth": "40-45%"},
      "actuals": {"revenue": "850"},
      "met_missed": "met",
      "new_guidance": {"revenue_growth": "45-50%"},
      "trajectory": "up"
    }
  ]
}
```

---

### PUT /api/concalls/{symbol}/{concall_id}/override

Manually override financial actuals for a quarter when yfinance data is unavailable.

**Request:**
```json
{
  "revenue": 850.0,
  "pat": 72.0,
  "eps": 12.5,
  "margin": 8.5
}
```

All fields are optional — only non-null values are saved.

**Response (200):**
```json
{
  "status": "updated",
  "quarter": "Q3FY25",
  "overrides": {
    "revenue": 850.0,
    "pat": 72.0,
    "eps": 12.5,
    "margin": 8.5,
    "stock_symbol": "V2RETAIL.NS",
    "period": "Q3FY25",
    "source": "manual"
  }
}
```

---

## Valuation

### POST /api/valuation/{symbol}/calculate

Run forward valuation with base/bull/bear scenarios.

**Request:**
```json
{
  "growth_rate": 25.0,
  "bull_delta": 10.0,
  "bear_delta": 10.0,
  "current_eps": null,
  "current_price": null,
  "shares_outstanding": null
}
```

If `current_eps` or `current_price` is null, the API fetches from the DB or yfinance.

**Response (200):**
```json
{
  "symbol": "V2RETAIL.NS",
  "current_price": 1250.5,
  "current_eps": 27.66,
  "current_pe": 45.2,
  "base": {
    "label": "Base",
    "growth_rate": 25.0,
    "forward_eps": 34.58,
    "forward_pat": 34.58,
    "forward_pe": 36.16,
    "peg": 1.45,
    "fair_value": 691.5,
    "upside_pct": -44.7,
    "phase": "Phase 2: Momentum (High PE / High Growth)",
    "phase_label": "Leading the Pack"
  },
  "bull": { ... },
  "bear": { ... },
  "overall_phase": "Phase 2: Momentum (High PE / High Growth)",
  "overall_phase_label": "Leading the Pack"
}
```

**Errors:**
- `400`: Could not fetch stock data / EPS and price required

---

### GET /api/valuation/{symbol}/latest

Return the most recent saved valuation for a stock.

**Response (200):**
```json
{
  "_id": "665...",
  "stock_symbol": "V2RETAIL.NS",
  "scenarios": { ... },
  "phase": "Phase 2: Momentum (High PE / High Growth)",
  "peg": 1.45,
  "upside_pct": -44.7,
  "created_at": "2025-01-15T12:00:00Z",
  "created_by": "chiragp"
}
```

**Errors:**
- `404`: No valuation found

---

## News

### GET /api/news/{symbol}?limit=5

Fetch recent news for a stock. Currently returns mock data.

**Query Parameters:**
- `limit` (optional, default 5, range 1-20)

**Response (200):**
```json
{
  "symbol": "V2RETAIL.NS",
  "news": [
    {
      "title": "Company reports strong quarterly earnings",
      "source": "Economic Times",
      "url": "https://example.com/news/1",
      "published_at": "2025-01-15T10:30:00Z",
      "summary": "The company reported results that exceeded expectations...",
      "sentiment": "positive",
      "symbol": "V2RETAIL",
      "fetched_at": "2025-01-15T12:00:00Z"
    }
  ]
}
```

---

## Error Format

All errors follow FastAPI's standard format:

```json
{
  "detail": "Human-readable error message"
}
```

Common HTTP status codes:
- `400`: Bad request (missing required fields, invalid data)
- `401`: Unauthorized (missing/expired/invalid JWT)
- `404`: Resource not found
- `409`: Conflict (e.g., duplicate username)
