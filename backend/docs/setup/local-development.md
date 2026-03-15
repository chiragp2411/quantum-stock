# QuantumStock — Local Development Setup

## Prerequisites

- **Python 3.12+**
- **Node.js 18+** (for the frontend)
- **MongoDB** running locally on `localhost:27017` (default, no auth)
- **uv** — Python package manager ([install guide](https://docs.astral.sh/uv/getting-started/installation/))
- **Ollama** — Local LLM runtime ([install guide](https://ollama.com))

## 1. Clone and Navigate

```bash
cd quantum-stock
```

## 2. Backend Setup

### Install dependencies

```bash
cd backend
uv sync
```

### Download the SpaCy model

```bash
uv pip install pip
uv run python -m spacy download en_core_web_sm
```

### Pull the Ollama model

```bash
ollama pull llama3.2:latest
```

### Configure environment

The backend reads `.env` from `backend/.env` if present, otherwise from the project root `.env`. Copy the example:

```bash
cp ../.env.example ../.env
```

Edit `.env` and set at minimum:

```env
ADMIN_PASS=your-admin-password
JWT_SECRET=a-strong-random-string-for-jwt
```

Full list of environment variables:

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017` | No | MongoDB connection string |
| `DB_NAME` | `quantumstock` | No | Database name |
| `OLLAMA_MODEL` | `llama3.2:latest` | No | Ollama model for summary generation |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | No | Ollama server URL |
| `SPACY_MODEL` | `en_core_web_sm` | No | SpaCy NLP model for entity extraction |
| `JWT_SECRET` | (auto-generated) | Recommended | JWT signing secret. Set this to persist sessions across restarts |
| `JWT_ALGORITHM` | `HS256` | No | JWT algorithm |
| `JWT_EXPIRE_HOURS` | `24` | No | Token expiry in hours |
| `ADMIN_PASS` | `admin123` | Recommended | Password for the seeded admin user |
| `CORS_ORIGINS` | `http://localhost:3000` | No | Comma-separated allowed CORS origins |

### Seed the admin user

```bash
uv run python seed.py
```

This creates a user `chiragp` with the password from `ADMIN_PASS`.

### Start the backend

```bash
uv run uvicorn app.main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.

### Verify

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "app": "QuantumStock",
  "ollama_connected": true,
  "ollama_model": "llama3.2:latest",
  "spacy_loaded": true,
  "spacy_model": "en_core_web_sm"
}
```

If `ollama_connected` is `false`, ensure Ollama is running (`ollama serve`).
If `spacy_loaded` is `false`, download the model: `uv run python -m spacy download en_core_web_sm`.

API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## 4. MongoDB Setup

### macOS (Homebrew)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Docker

```bash
docker run -d --name quantumstock-mongo -p 27017:27017 mongo:7
```

### Verify MongoDB

```bash
mongosh --eval "db.runCommand({ping: 1})"
```

## 5. Development Workflow

### Typical flow

1. Start MongoDB
2. Start Ollama: `ollama serve` (may already be running as a system service)
3. Start backend: `cd backend && uv run uvicorn app.main:app --reload --port 8000`
4. Start frontend: `cd frontend && npm run dev`
5. Open `http://localhost:3000`
6. Login with `chiragp` / your `ADMIN_PASS`

### Adding a new dependency

```bash
cd backend
uv add package-name
```

### Running the backend with a specific port

```bash
uv run uvicorn app.main:app --reload --port 9000
```

## 6. Troubleshooting

### Con-call analysis fails or shows "Unknown"
- Ensure Ollama is running: `ollama list` should show available models
- Ensure the model is pulled: `ollama pull llama3.2:latest`
- Check backend logs for connection errors or missing key warnings
- SpaCy extraction is instant (<2s); Ollama summary takes ~25s per concall

### SpaCy model not found
- Run: `uv pip install pip && uv run python -m spacy download en_core_web_sm`

### yfinance returns no data
- Verify the stock symbol with `.NS` or `.BO` suffix
- Some stocks may not be available on Yahoo Finance
- Use manual overrides in the valuation page

### MongoDB connection refused
- Ensure MongoDB is running: `brew services list` or `docker ps`
- Check `MONGO_URI` in `.env`

### JWT tokens expire on restart
- Set `JWT_SECRET` to a fixed value in `.env`

### Frontend shows 401 errors
- Token may have expired — log out and log in again
- Check that the backend is running on port 8000

### Old Gemini error messages still showing
- These are from before the Ollama migration. Use the "Clear failed" button on the concalls page to delete them, then re-upload and analyze.
