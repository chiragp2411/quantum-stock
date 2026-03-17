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

    Q1-Q3 of FYxx → Valuation targets FYxx (current year's full-year projections).
    Q4 of FYxx → Valuation targets FY(xx+1) since FYxx is complete.
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
    structured = analysis.get("structured_guidance", [])
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
    source_label = None
    source_raw_value = None
    growth_type = "unknown"  # "pat_direct" | "revenue_proxy" | "derived" | "historical" | "default"
    assumptions: list[str] = []
    guidance_items_used: list[dict] = []

    current_pat_margin = None
    if analysis.get("pat_margin_pct") is not None:
        current_pat_margin = analysis["pat_margin_pct"]
    elif analysis.get("pat_cr") and analysis.get("revenue_cr") and analysis["revenue_cr"] > 0:
        current_pat_margin = round(analysis["pat_cr"] / analysis["revenue_cr"] * 100, 1)

    fwd_period = _forward_period(quarter)

    def _sg_items(metric_key: str, unit: str | None = None) -> list[dict]:
        """Find structured guidance items by metric key and optional unit."""
        return [
            item for item in structured
            if isinstance(item, dict)
            and item.get("metric") == metric_key
            and item.get("guidance_type") != "withdrawn"
            and (unit is None or item.get("unit") == unit)
        ]

    def _sg_value(items: list[dict]) -> float | None:
        """Get best numeric value from guidance items (prefer high, then low)."""
        for item in items:
            v = item.get("value_high") or item.get("value_low")
            if v is not None and v > 0:
                return float(v)
        return None

    def _set_found(
        val: float, key: str, label: str, raw: str, items: list[dict],
    ) -> None:
        nonlocal suggested, source_key, source_label, source_raw_value
        suggested = val
        source_key = key
        source_label = label
        source_raw_value = raw
        guidance_items_used.extend(items)

    # ===================================================================
    # Strategy 1: Structured guidance — direct growth % metrics
    # ===================================================================
    if structured and suggested is None:
        growth_metrics = [
            ("pat_growth", "PAT Growth", "pat_direct"),
            ("ebitda_growth", "EBITDA Growth", "revenue_proxy"),
            ("earnings_cagr", "Earnings CAGR", "pat_direct"),
            ("revenue_growth", "Revenue Growth", "revenue_proxy"),
        ]
        for metric_key, label, gtype in growth_metrics:
            items = _sg_items(metric_key, unit="pct")
            val = _sg_value(items)
            if val is not None:
                _set_found(val, metric_key, f"{label} (management guidance)", items[0].get("value_text", ""), items[:1])
                growth_type = gtype
                if "revenue" in metric_key or "ebitda" in metric_key:
                    margin_note = ""
                    if current_pat_margin is not None:
                        margin_note = f" Current PAT margin is {current_pat_margin}%."
                    assumptions.append(
                        f"PAT/EPS growth guidance not directly available. Using {label} ({val}%) as proxy. "
                        f"Forward EPS = Current EPS × (1 + {val}%). "
                        f"This assumes EPS grows at the same rate as {label.lower()}, "
                        f"implying net profit margins stay constant.{margin_note}"
                    )
                break

    # ===================================================================
    # Strategy 2: Calculate implied growth from consecutive FY absolute targets
    #   e.g. revenue FY26=6100cr, FY27=8100cr → growth = 32.8%
    # ===================================================================
    if structured and suggested is None:
        for abs_metric, label in [("pat", "PAT"), ("revenue", "Revenue")]:
            abs_items = _sg_items(abs_metric, unit="cr")
            if len(abs_items) < 2:
                continue

            by_period: dict[str, float] = {}
            for item in abs_items:
                p = item.get("period", "")
                v = item.get("value_high") or item.get("value_low")
                if v and v > 0:
                    by_period[p] = v

            sorted_periods = sorted(by_period.keys(), key=lambda p: _parse_quarter(f"Q4{p}")[1] if "FY" in p else 0)
            for i in range(len(sorted_periods) - 1):
                p_cur, p_next = sorted_periods[i], sorted_periods[i + 1]
                v_cur, v_next = by_period[p_cur], by_period[p_next]
                if v_cur > 0 and v_next > v_cur:
                    _, fy_cur = _parse_quarter(f"Q4{p_cur}")
                    _, fy_next = _parse_quarter(f"Q4{p_next}")
                    years = max(fy_next - fy_cur, 1)
                    if years == 1:
                        implied = ((v_next / v_cur) - 1) * 100
                    else:
                        implied = ((v_next / v_cur) ** (1 / years) - 1) * 100
                    implied = round(implied, 1)
                    if implied > 0:
                        raw_text = f"{label} {p_cur}=₹{v_cur:.0f}cr → {p_next}=₹{v_next:.0f}cr"
                        used = [it for it in abs_items if it.get("period") in (p_cur, p_next)]
                        _set_found(implied, f"implied_{abs_metric}_growth", f"Implied {label} Growth ({p_cur}→{p_next})", raw_text, used)
                        assumptions.append(
                            f"Management guided absolute {label} targets: ₹{v_cur:.0f} cr ({p_cur}) → "
                            f"₹{v_next:.0f} cr ({p_next}). System calculated implied "
                            f"{'CAGR' if years > 1 else 'YoY growth'} of {implied:.1f}%."
                        )
                        if abs_metric == "revenue":
                            growth_type = "revenue_proxy"
                            margin_note = f" Current PAT margin: {current_pat_margin}%." if current_pat_margin else ""
                            assumptions.append(
                                f"This is revenue growth, not PAT growth. "
                                f"Forward EPS = Current EPS × (1 + {implied:.1f}%). "
                                f"This assumes constant net margins.{margin_note}"
                            )
                        else:
                            growth_type = "pat_direct"
                        break
            if suggested is not None:
                break

    # ===================================================================
    # Strategy 3: Derive PAT growth from (forward revenue * PAT margin guidance)
    #   e.g. revenue FY27=8100cr + PAT margin FY27=4.25% → forward PAT=344cr
    #   Compare with trailing PAT to get implied growth
    # ===================================================================
    if structured and suggested is None:
        rev_items = _sg_items("revenue", unit="cr")
        margin_items = _sg_items("pat_margin", unit="pct")
        if rev_items and margin_items:
            fwd_rev = _sg_value(rev_items)
            fwd_margin = _sg_value(margin_items)
            trailing_pat = analysis.get("pat_cr")
            if not trailing_pat:
                for prev_doc in candidates[1:3]:
                    pa = prev_doc.get("analysis", {})
                    if pa.get("pat_cr"):
                        trailing_pat = pa["pat_cr"]
                        break

            if fwd_rev and fwd_margin and trailing_pat and trailing_pat > 0:
                fwd_pat = fwd_rev * (fwd_margin / 100)
                annual_pat = trailing_pat * 4
                if annual_pat > 0 and fwd_pat > 0:
                    implied = ((fwd_pat / annual_pat) - 1) * 100
                    if implied > 0:
                        raw = f"Rev ₹{fwd_rev:.0f}cr × Margin {fwd_margin}% = PAT ₹{fwd_pat:.0f}cr vs trailing ₹{annual_pat:.0f}cr"
                        _set_found(round(implied, 1), "derived_pat_growth", "Derived PAT Growth (Revenue × Margin guidance)", raw, rev_items[:1] + margin_items[:1])
                        growth_type = "derived"
                        assumptions.append(
                            f"PAT growth calculated from: Forward Revenue (₹{fwd_rev:.0f} cr) × "
                            f"PAT Margin ({fwd_margin}%) = Forward PAT ₹{fwd_pat:.0f} cr, vs "
                            f"trailing annualized PAT ₹{annual_pat:.0f} cr. "
                            "This uses both revenue AND margin guidance for a margin-adjusted estimate."
                        )

    # ===================================================================
    # Strategy 4: Legacy guidance dict — broad search for growth/CAGR keys
    # ===================================================================
    if suggested is None and guidance:
        growth_keywords_priority = [
            (["pat_growth", "pat_cagr", "earnings_growth", "earnings_cagr"], "PAT/Earnings Growth (legacy)", "pat_direct"),
            (["revenue_growth", "revenue_cagr", "sales_growth", "topline_growth"], "Revenue Growth (legacy)", "revenue_proxy"),
        ]
        for keyword_group, label, gtype in growth_keywords_priority:
            for gkey, gval in guidance.items():
                gkey_lower = gkey.lower().replace(" ", "_").replace("-", "_")
                if any(kw in gkey_lower for kw in keyword_group):
                    numbers = re.findall(r"[\d.]+", str(gval))
                    if numbers:
                        try:
                            val = float(numbers[-1])
                            if val > 0:
                                _set_found(val, gkey, label, str(gval), [])
                                growth_type = gtype
                                if "revenue" in label.lower():
                                    margin_note = f" Current PAT margin: {current_pat_margin}%." if current_pat_margin else ""
                                    assumptions.append(
                                        f"PAT growth not found. Using revenue/CAGR guidance as proxy. "
                                        f"Assumes constant margins.{margin_note}"
                                    )
                                break
                        except (ValueError, IndexError):
                            continue
            if suggested is not None:
                break

    # ===================================================================
    # Strategy 5: Historical PAT/revenue growth from THIS concall analysis
    # ===================================================================
    if suggested is None:
        if analysis.get("pat_growth_yoy_pct") is not None and analysis["pat_growth_yoy_pct"] > 0:
            val = analysis["pat_growth_yoy_pct"]
            _set_found(round(val, 1), "pat_growth_yoy_pct", "Reported PAT Growth YoY% (backward-looking)", f"{val:.1f}%", [])
            growth_type = "historical"
            assumptions.append(
                "No forward guidance found in this concall. Using the reported PAT growth "
                "rate from this quarter. This is backward-looking — future may differ."
            )
        elif analysis.get("revenue_growth_yoy_pct") is not None and analysis["revenue_growth_yoy_pct"] > 0:
            val = analysis["revenue_growth_yoy_pct"]
            _set_found(round(val, 1), "revenue_growth_yoy_pct", "Reported Revenue Growth YoY% (backward-looking)", f"{val:.1f}%", [])
            growth_type = "historical"
            margin_note = f" Current PAT margin: {current_pat_margin}%." if current_pat_margin else ""
            assumptions.append(
                "No forward guidance found. Using reported revenue growth as proxy. "
                f"This is backward-looking and revenue-based. Assumes constant margins.{margin_note}"
            )

    # ===================================================================
    # Strategy 6: Historical growth from PREVIOUS concalls
    # ===================================================================
    if suggested is None:
        for prev_doc in candidates[1:4]:
            pa = prev_doc.get("analysis", {})
            if not pa:
                continue
            for field, label in [
                ("pat_growth_yoy_pct", "PAT Growth YoY%"),
                ("revenue_growth_yoy_pct", "Revenue Growth YoY%"),
            ]:
                val = pa.get(field)
                if val is not None and val > 0:
                    prev_q = pa.get("quarter", "prior quarter")
                    _set_found(round(val, 1), field, f"{label} from {prev_q} (backward-looking)", f"{val:.1f}%", [])
                    growth_type = "historical"
                    assumptions.append(
                        f"No forward guidance in latest concall. Using {label} ({val:.1f}%) "
                        f"from {prev_q}. This is backward-looking."
                    )
                    break
            if suggested is not None:
                break

    # ===================================================================
    # Strategy 7: Default 20% — absolute last resort
    # ===================================================================
    if suggested is None:
        growth_type = "default"
        assumptions.append(
            "No forward guidance, no absolute targets, and no historical growth data "
            "found across all analyzed concalls. Growth rate defaults to 20%. "
            "Override with your own research."
        )

    if not guidance and not structured:
        assumptions.append(
            "The AI could not extract any forward guidance from this con-call. "
            "Management may not have provided specific numbers."
        )

    return {
        "symbol": symbol,
        "suggested_growth": round(suggested, 1) if suggested else None,
        "source": source_key,
        "source_label": source_label,
        "source_raw_value": source_raw_value,
        "growth_type": growth_type,
        "current_pat_margin": current_pat_margin,
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
        "structured_guidance": structured,
        "guidance_items_used": guidance_items_used,
        "financials_extracted": financials_extracted,
        "tone_score": analysis.get("tone_score"),
        "execution_score": analysis.get("management_execution_score"),
        "assumptions": assumptions,
        "total_concalls_analyzed": len(
            [c for c in candidates if c.get("analysis")]
        ),
    }
