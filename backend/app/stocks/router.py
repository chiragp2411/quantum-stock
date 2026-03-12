"""Stock endpoints: search, summary, recent analyses."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.utils import get_current_user
from app.database import stocks_col, concalls_col, valuations_col
from app.stocks.models import StockInfo, StockSummary
from app.stocks.yfinance_service import validate_symbol, fetch_stock_info

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _serialize(doc: dict) -> dict:
    """Convert MongoDB document for JSON response."""
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/search")
def search_stock(
    q: str = Query(..., min_length=1),
    _user: dict = Depends(get_current_user),
):
    """Validate symbol, fetch from yfinance, upsert to DB, return stock info."""
    symbol = validate_symbol(q)
    info = fetch_stock_info(symbol)

    if not info:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Could not fetch data for '{symbol}'. Verify the symbol is correct.",
        )

    col = stocks_col()
    col.update_one(
        {"symbol": symbol},
        {"$set": {**info.model_dump(), "last_updated": datetime.now(timezone.utc)}},
        upsert=True,
    )

    return info.model_dump()


@router.get("/recent")
def recent_stocks(_user: dict = Depends(get_current_user)):
    """Return the 10 most recently updated stocks."""
    docs = (
        stocks_col()
        .find()
        .sort("last_updated", -1)
        .limit(10)
    )
    results = []
    for doc in docs:
        concall_count = concalls_col().count_documents(
            {"stock_symbol": doc["symbol"]}
        )
        latest_val = valuations_col().find_one(
            {"stock_symbol": doc["symbol"]},
            sort=[("created_at", -1)],
        )
        results.append(
            {
                **_serialize(doc),
                "concall_count": concall_count,
                "latest_phase": latest_val.get("phase") if latest_val else None,
            }
        )
    return results


@router.get("/{symbol}/summary")
def stock_summary(
    symbol: str,
    _user: dict = Depends(get_current_user),
) -> dict:
    """Return stored stock info plus concall/valuation stats."""
    symbol = validate_symbol(symbol)
    doc = stocks_col().find_one({"symbol": symbol})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Stock not found in database")

    concall_count = concalls_col().count_documents({"stock_symbol": symbol})
    latest_val = valuations_col().find_one(
        {"stock_symbol": symbol}, sort=[("created_at", -1)]
    )

    return {
        "stock": _serialize(doc),
        "concall_count": concall_count,
        "latest_valuation": _serialize(latest_val) if latest_val else None,
    }
