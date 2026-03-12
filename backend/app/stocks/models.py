"""Pydantic models for stocks and Lynch classification."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel


class LynchCategory(str, Enum):
    FAST_GROWER = "Fast Grower"
    STALWART = "Stalwart"
    SLOW_GROWER = "Slow Grower"
    CYCLICAL = "Cyclical"
    TURNAROUND = "Turnaround"
    ASSET_PLAY = "Asset Play"


CYCLICAL_SECTORS = {
    "metals & mining",
    "steel",
    "cement",
    "automobiles",
    "auto components",
    "construction",
    "real estate",
    "oil & gas",
    "commodities",
    "airlines",
    "shipping",
    "sugar",
    "paper",
    "textiles",
}


def classify_lynch(
    eps_growth: float,
    market_cap: float,
    sector: str = "",
    earnings_volatile: bool = False,
    earnings_negative_turning_positive: bool = False,
) -> LynchCategory:
    """Classify a stock into a Peter Lynch category.

    Args:
        eps_growth: Trailing 3-year EPS CAGR as a percentage.
        market_cap: Market cap in INR crores.
        sector: Company sector (lowercase).
        earnings_volatile: Whether earnings show high variance.
        earnings_negative_turning_positive: Turnaround signal.
    """
    if earnings_negative_turning_positive:
        return LynchCategory.TURNAROUND

    if sector.lower() in CYCLICAL_SECTORS and earnings_volatile:
        return LynchCategory.CYCLICAL

    if eps_growth > 20 and market_cap < 50000:
        return LynchCategory.FAST_GROWER

    if 10 <= eps_growth <= 20 and market_cap >= 50000:
        return LynchCategory.STALWART

    if eps_growth < 10:
        return LynchCategory.SLOW_GROWER

    if eps_growth > 20 and market_cap >= 50000:
        return LynchCategory.FAST_GROWER

    return LynchCategory.STALWART


class StockInfo(BaseModel):
    symbol: str
    name: str = ""
    exchange: str = ""
    sector: str = ""
    industry: str = ""
    market_cap: float = 0.0
    current_price: float = 0.0
    pe_ratio: float = 0.0
    eps: float = 0.0
    eps_growth: float = 0.0
    dividend_yield: float = 0.0
    week_52_high: float = 0.0
    week_52_low: float = 0.0
    lynch_category: str = LynchCategory.STALWART.value


class StockSummary(BaseModel):
    stock: StockInfo
    concall_count: int = 0
    latest_valuation: Optional[dict] = None
