"""Stock endpoints: search, summary, recent analyses."""

import re
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
    """Validate symbol, fetch from yfinance, upsert to DB, return stock info.
    Requires auth because it writes to DB via external API."""
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
def recent_stocks():
    """Return the 10 most recently updated stocks. Public endpoint."""
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


@router.get("/dashboard-stats")
def dashboard_stats():
    """Aggregate stats for the dashboard overview. Public endpoint."""
    total_stocks = stocks_col().count_documents({})
    total_concalls = concalls_col().count_documents({})
    analyzed_concalls = concalls_col().count_documents({"analysis": {"$ne": None}})
    total_valuations = valuations_col().count_documents({})

    sectors: list[str] = stocks_col().distinct("sector")
    sectors = [s for s in sectors if s]

    bargains = valuations_col().count_documents(
        {"phase": {"$regex": "Phase 1", "$options": "i"}}
    )

    recent_activity = []
    for doc in concalls_col().find(
        {"analyzed_at": {"$ne": None}},
        {"stock_symbol": 1, "quarter": 1, "analyzed_at": 1},
    ).sort("analyzed_at", -1).limit(5):
        recent_activity.append({
            "symbol": doc["stock_symbol"],
            "quarter": doc.get("quarter", ""),
            "analyzed_at": doc["analyzed_at"].isoformat() if doc.get("analyzed_at") else None,
        })

    return {
        "total_stocks": total_stocks,
        "total_concalls": total_concalls,
        "analyzed_concalls": analyzed_concalls,
        "total_valuations": total_valuations,
        "sectors": sectors,
        "sector_count": len(sectors),
        "bargains": bargains,
        "recent_activity": recent_activity,
    }


@router.get("/explore")
def explore_stocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
    search: str = Query("", description="Filter by name, symbol, or sector"),
    sector: str = Query("", description="Filter by sector"),
    sort_by: str = Query("eps_growth", description="Sort field"),
    sort_order: str = Query("desc", description="asc or desc"),
):
    """Paginated, searchable stock listing for the explore page."""
    query: dict = {}

    if search:
        regex = re.compile(re.escape(search), re.IGNORECASE)
        query["$or"] = [
            {"symbol": {"$regex": regex}},
            {"name": {"$regex": regex}},
            {"sector": {"$regex": regex}},
        ]

    if sector:
        query["sector"] = sector

    sort_field_map = {
        "name": "name",
        "eps_growth": "eps_growth",
        "pe_ratio": "pe_ratio",
        "market_cap": "market_cap",
        "current_price": "current_price",
        "concall_count": "concall_count",
    }

    mongo_sort_field = sort_field_map.get(sort_by, "eps_growth")
    mongo_sort_dir = 1 if sort_order == "asc" else -1

    col = stocks_col()
    total = col.count_documents(query)

    skip = (page - 1) * page_size
    docs = list(
        col.find(query)
        .sort(mongo_sort_field, mongo_sort_dir)
        .skip(skip)
        .limit(page_size)
    )

    results = []
    for doc in docs:
        concall_count = concalls_col().count_documents({"stock_symbol": doc["symbol"]})
        latest_val = valuations_col().find_one(
            {"stock_symbol": doc["symbol"]}, sort=[("created_at", -1)]
        )
        results.append({
            **_serialize(doc),
            "concall_count": concall_count,
            "latest_phase": latest_val.get("phase") if latest_val else None,
        })

    sectors_list = [s for s in col.distinct("sector") if s]

    return {
        "stocks": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "sectors": sorted(sectors_list),
    }


@router.get("/{symbol}/summary")
def stock_summary(symbol: str) -> dict:
    """Return stored stock info plus concall/valuation stats. Public endpoint."""
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
