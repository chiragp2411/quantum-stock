"""Valuation endpoints: calculate scenarios, get latest valuation, guidance-based auto-fill."""

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.utils import get_current_user
from app.database import concalls_col, stocks_col, valuations_col
from app.stocks.yfinance_service import validate_symbol, fetch_stock_info
from app.valuation.models import ScenarioInput, ValuationResult
from app.valuation.calculator import calculate_valuation

router = APIRouter(prefix="/api/valuation", tags=["valuation"])


@router.post("/{symbol}/calculate", response_model=ValuationResult)
def calculate(
    symbol: str,
    params: ScenarioInput,
    _user: dict = Depends(get_current_user),
):
    """Run forward valuation with base/bull/bear scenarios."""
    symbol = validate_symbol(symbol)

    current_eps = params.current_eps
    current_price = params.current_price
    shares = params.shares_outstanding or 1.0

    if current_eps is None or current_price is None:
        stock = stocks_col().find_one({"symbol": symbol})
        if not stock:
            info = fetch_stock_info(symbol)
            if not info:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Could not fetch stock data. Please provide current_eps and current_price manually.",
                )
            current_eps = current_eps or info.eps
            current_price = current_price or info.current_price
        else:
            current_eps = current_eps or stock.get("eps", 0)
            current_price = current_price or stock.get("current_price", 0)

    if not current_eps or not current_price:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "EPS and price are required. Provide them manually if yfinance data is unavailable.",
        )

    result = calculate_valuation(
        symbol=symbol,
        growth_rate=params.growth_rate,
        bull_delta=params.bull_delta,
        bear_delta=params.bear_delta,
        current_eps=current_eps,
        current_price=current_price,
        shares_outstanding_cr=shares,
    )

    valuations_col().insert_one(
        {
            "stock_symbol": symbol,
            "scenarios": result.model_dump(),
            "phase": result.overall_phase,
            "peg": result.base.peg,
            "upside_pct": result.base.upside_pct,
            "created_at": datetime.now(timezone.utc),
            "created_by": _user["username"],
        }
    )

    return result


@router.get("/{symbol}/latest")
def latest_valuation(symbol: str):
    """Return the most recent valuation for a stock."""
    symbol = validate_symbol(symbol)
    doc = valuations_col().find_one(
        {"stock_symbol": symbol}, sort=[("created_at", -1)]
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No valuation found")

    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/{symbol}/guidance-prefill")
def guidance_prefill(symbol: str):
    """Extract growth rate from latest con-call guidance for valuation pre-fill."""
    symbol = validate_symbol(symbol)

    candidates = list(
        concalls_col()
        .find(
            {
                "stock_symbol": symbol,
                "status": "completed",
                "analysis": {"$ne": None},
            }
        )
        .sort("uploaded_at", -1)
        .limit(20)
    )

    def _quarter_sort_key(doc: dict) -> str:
        """Convert quarter like Q3FY26 to sortable string like 2026-3."""
        q = (doc.get("analysis") or {}).get("quarter", doc.get("quarter", ""))
        import re as _re
        m = _re.match(r"Q(\d)\s*FY\s*(\d{2,4})", str(q), _re.IGNORECASE)
        if m:
            qn, yr = int(m.group(1)), int(m.group(2))
            if yr < 100:
                yr += 2000
            return f"{yr:04d}-{qn}"
        return "0000-0"

    candidates.sort(key=_quarter_sort_key, reverse=True)
    latest = candidates[0] if candidates else None

    if not latest or not latest.get("analysis"):
        return {"symbol": symbol, "suggested_growth": None, "source": None}

    analysis = latest["analysis"]
    guidance = analysis.get("guidance", {})
    trajectory = analysis.get("guidance_trajectory")

    suggested = None
    source_key = None

    for key in ("pat_growth", "pat_growth_pct", "pat", "earnings_growth", "revenue_growth"):
        val = guidance.get(key, "")
        numbers = re.findall(r"[\d.]+", str(val))
        if numbers:
            try:
                suggested = float(numbers[-1])
                source_key = key
                break
            except (ValueError, IndexError):
                continue

    if suggested is None and analysis.get("pat_growth_yoy_pct") is not None:
        suggested = abs(analysis["pat_growth_yoy_pct"])
        source_key = "pat_growth_yoy_pct (extracted)"

    return {
        "symbol": symbol,
        "suggested_growth": round(suggested, 1) if suggested else None,
        "source": source_key,
        "trajectory": trajectory,
        "quarter": analysis.get("quarter"),
    }
