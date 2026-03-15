# Feature: Explore Stocks

## Overview

The Explore page provides a server-side paginated, searchable, and sortable table of all tracked stocks. Users can filter by sector, search by name/symbol, and sort by key metrics.

## Server-Side Pagination

- Default page size: 50
- Available sizes: 10–200 (enforced via `ge=10, le=200`)
- All filtering, sorting, and pagination happens on the server to handle large stock lists efficiently

## API Endpoint

`GET /api/stocks/explore`

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number (1-based) |
| page_size | int | 50 | Items per page (10–200) |
| search | str | "" | Search by name, symbol, or sector (regex, case-insensitive) |
| sector | str | "" | Filter by exact sector name |
| sort_by | str | "eps_growth" | Sort field |
| sort_order | str | "desc" | "asc" or "desc" |

### Sortable Fields

| sort_by | MongoDB Field | Description |
|---------|---------------|-------------|
| name | name | Company name |
| eps_growth | eps_growth | EPS growth % (from yfinance) |
| pe_ratio | pe_ratio | Trailing P/E |
| market_cap | market_cap | Market cap (₹ cr) |
| current_price | current_price | Current price |
| concall_count | concall_count | Number of concalls (requires aggregation; may not order correctly when stocks lack this field) |

### Response

```json
{
  "stocks": [
    {
      "_id": "...",
      "symbol": "SGMART.NS",
      "name": "Sarda Energy & Minerals",
      "sector": "Metals & Mining",
      "current_price": 245.5,
      "pe_ratio": 12.3,
      "eps_growth": 28.5,
      "market_cap": 8500,
      "concall_count": 4,
      "latest_phase": "Phase 1: Bargain (Low PE / High Growth)"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 50,
  "total_pages": 3,
  "sectors": ["IT", "Auto", "Banking", "Metals & Mining", ...]
}
```

Each stock includes `concall_count` (computed per-request) and `latest_phase` (from most recent valuation) in addition to stored stock fields.

## Frontend

- Search input with debounced server-side search
- Sector filter pills (from API response)
- Sortable columns: Company, EPS Growth, PE, Price, Con-Calls
- Pagination controls: Prev/Next, page numbers, page size selector
- Each row links to the stock detail page

**Note**: The current Explore page (`/explore`) may use `/api/stocks/recent` (10 most recent stocks) with client-side filtering. The full server-side paginated API is available at `/api/stocks/explore` for integration.

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/stocks/router.py` | `explore_stocks()` endpoint |
| `frontend/src/app/explore/page.tsx` | Explore page with table and filters |
