"""Valuation endpoints: calculate scenarios, get latest valuation."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.utils import get_current_user
from app.database import stocks_col, valuations_col
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
def latest_valuation(
    symbol: str,
    _user: dict = Depends(get_current_user),
):
    """Return the most recent valuation for a stock."""
    symbol = validate_symbol(symbol)
    doc = valuations_col().find_one(
        {"stock_symbol": symbol}, sort=[("created_at", -1)]
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No valuation found")

    doc["_id"] = str(doc["_id"])
    return doc
