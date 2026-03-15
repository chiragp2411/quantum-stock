# Feature: Session Notebook

## Overview

The Session Notebook is a per-stock note-taking system that lets investors document their investment thesis, observations, switch triggers, and quarterly updates. Each note is tied to a specific stock and optionally to a quarter.

## Note Types

| Type | Purpose | Example |
|------|---------|---------|
| Investment Thesis | Why you own/want to own this stock | "Strong moat in prefab steel, 30% revenue CAGR, Phase 1 at PEG 0.7" |
| Observation | Interesting data points or patterns | "Management guided 35% growth but actual was 28% — watch next quarter" |
| Switch Trigger | Conditions that would make you exit | "Two consecutive guidance cuts, or debt/equity crosses 1.5x" |
| Quarterly Update | Notes after reviewing each quarter | "Q3FY26: Beat guidance, trajectory up, added position" |

## Data Model

```json
{
  "stock_symbol": "SGMART.NS",
  "note_type": "thesis",
  "content": "Strong moat in prefab steel...",
  "quarter": "Q3FY26",
  "created_at": "2026-03-15T10:30:00Z",
  "updated_at": null,
  "created_by": "chiragp"
}
```

Notes are stored in the `stock_notes` collection with a compound index on `(stock_symbol, created_at)` for efficient listing.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/notes/{symbol}` | No | List all notes for a stock |
| POST | `/api/notes/{symbol}` | Yes | Create a new note |
| PUT | `/api/notes/{symbol}/{id}` | Yes | Update note content |
| DELETE | `/api/notes/{symbol}/{id}` | Yes | Delete a note |

## Request/Response Models

### Create Note (POST)

```json
{
  "note_type": "thesis",
  "content": "Free-text markdown content",
  "quarter": "Q3FY26"
}
```

### Update Note (PUT)

```json
{
  "content": "Updated content"
}
```

## Frontend

- Located in the stock overview page below the feature cards
- Only authenticated users see the "Add Note" button
- Notes are editable inline with save/cancel
- Each note shows type badge, optional quarter badge, timestamp, and author

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/notes/router.py` | CRUD API endpoints |
| `backend/app/database.py` | `notes_col()` accessor (stock_notes), compound index |
| `frontend/src/components/notes/session-notebook.tsx` | Full notebook UI component |
