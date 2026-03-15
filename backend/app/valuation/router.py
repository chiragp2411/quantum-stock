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


def _parse_quarter(q: str) -> tuple[int, int]:
    """Parse 'Q3FY26' → (quarter_num=3, fiscal_year=2026). Returns (0,0) on failure."""
    m = re.match(r"Q(\d)\s*FY\s*(\d{2,4})", str(q), re.IGNORECASE)
    if not m:
        return 0, 0
    qn, yr = int(m.group(1)), int(m.group(2))
    if yr < 100:
        yr += 2000
    return qn, yr


def _forward_period(quarter: str) -> str:
    """Determine the forward valuation period from the concall quarter.

    Guidance given in Q3FY26 (Oct-Dec 2025) is typically for FY26 remaining + FY27.
    The forward period for valuation is the NEXT full fiscal year.
    """
    qn, fy = _parse_quarter(quarter)
    if fy == 0:
        return "Unknown"
    if qn == 4:
        return f"FY{(fy + 1) % 100:02d}"
    return f"FY{fy % 100:02d}"


@router.get("/{symbol}/guidance-prefill")
def guidance_prefill(symbol: str):
    """Extract growth rate from latest con-call guidance for valuation pre-fill.

    Returns full transparency: exact management guidance text, which concall,
    which field was used, what assumptions were made, and the forward period.
    """
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
        q = (doc.get("analysis") or {}).get("quarter", doc.get("quarter", ""))
        qn, yr = _parse_quarter(q)
        return f"{yr:04d}-{qn}" if yr else "0000-0"

    candidates.sort(key=_quarter_sort_key, reverse=True)
    latest = candidates[0] if candidates else None

    empty_response = {
        "symbol": symbol,
        "suggested_growth": None,
        "source": None,
        "source_label": None,
        "source_raw_value": None,
        "trajectory": None,
        "trajectory_detail": None,
        "quarter": None,
        "forward_period": None,
        "concall_filename": None,
        "analyzed_at": None,
        "full_guidance": {},
        "financials_extracted": {},
        "assumptions": [
            "No analyzed con-calls found for this stock.",
            "Growth rate defaults to 20%. You should enter a growth rate based on your own research.",
        ],
        "total_concalls_analyzed": len(candidates),
    }

    if not latest or not latest.get("analysis"):
        return empty_response

    analysis = latest["analysis"]
    guidance = analysis.get("guidance", {})
    trajectory = analysis.get("guidance_trajectory")
    quarter = analysis.get("quarter", latest.get("quarter", ""))

    financials_extracted = {}
    for field in (
        "revenue_cr", "ebitda_cr", "pat_cr",
        "ebitda_margin_pct", "pat_margin_pct",
        "revenue_growth_yoy_pct", "pat_growth_yoy_pct",
    ):
        val = analysis.get(field)
        if val is not None:
            financials_extracted[field] = val

    suggested = None
    source_key = None
    source_raw_value = None
    assumptions: list[str] = []

    priority_fields = [
        ("pat_growth", "PAT Growth (management guidance)"),
        ("pat_growth_pct", "PAT Growth % (management guidance)"),
        ("pat", "PAT (management guidance)"),
        ("earnings_growth", "Earnings Growth (management guidance)"),
        ("revenue_growth", "Revenue Growth (management guidance)"),
    ]

    for key, label in priority_fields:
        val = guidance.get(key, "")
        if not val:
            continue
        numbers = re.findall(r"[\d.]+", str(val))
        if numbers:
            try:
                suggested = float(numbers[-1])
                source_key = key
                source_raw_value = str(val)
                break
            except (ValueError, IndexError):
                continue

    if suggested is not None:
        source_label = next(
            (label for k, label in priority_fields if k == source_key), source_key
        )
        if source_key and "revenue" in source_key:
            assumptions.append(
                "PAT growth guidance was not available in this con-call. "
                "Using revenue growth as a proxy — actual PAT growth may differ "
                "depending on margin expansion/compression."
            )
    else:
        if analysis.get("pat_growth_yoy_pct") is not None:
            suggested = abs(analysis["pat_growth_yoy_pct"])
            source_key = "pat_growth_yoy_pct"
            source_label = "Historical PAT Growth YoY% (not forward guidance)"
            source_raw_value = f"{analysis['pat_growth_yoy_pct']:.1f}%"
            assumptions.append(
                "No explicit forward guidance found in the con-call. "
                "Using the historically reported PAT growth rate as a proxy. "
                "This is backward-looking — actual future growth may differ."
            )
        else:
            source_label = None
            assumptions.append(
                "No forward guidance and no historical PAT growth data found. "
                "Growth rate defaults to 20%. You should enter a growth rate "
                "based on your own research or the company's investor presentation."
            )

    if not guidance:
        assumptions.append(
            "The AI could not extract any forward guidance metrics from this "
            "con-call transcript. This may mean management did not provide "
            "specific numerical guidance, or the transcript quality was poor."
        )

    fwd_period = _forward_period(quarter)

    return {
        "symbol": symbol,
        "suggested_growth": round(suggested, 1) if suggested else None,
        "source": source_key,
        "source_label": source_label,
        "source_raw_value": source_raw_value,
        "trajectory": trajectory,
        "trajectory_detail": analysis.get("guidance_trajectory_detail"),
        "quarter": quarter,
        "forward_period": fwd_period,
        "concall_filename": latest.get("pdf_filename", "Unknown"),
        "analyzed_at": (
            latest["analyzed_at"].isoformat()
            if latest.get("analyzed_at")
            else None
        ),
        "full_guidance": guidance,
        "financials_extracted": financials_extracted,
        "tone_score": analysis.get("tone_score"),
        "execution_score": analysis.get("management_execution_score"),
        "assumptions": assumptions,
        "total_concalls_analyzed": len(
            [c for c in candidates if c.get("analysis")]
        ),
    }
