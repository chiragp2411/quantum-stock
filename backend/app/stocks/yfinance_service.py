"""yfinance wrapper with TTL-based caching for Indian stock data."""

import time
import logging
from functools import wraps
from typing import Optional

import yfinance as yf

from app.stocks.models import StockInfo, classify_lynch

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[float, StockInfo]] = {}
CACHE_TTL = 900  # 15 minutes


def _ttl_cache(ttl: int):
    """Simple TTL cache decorator for stock lookups."""
    def decorator(func):
        @wraps(func)
        def wrapper(symbol: str) -> Optional[StockInfo]:
            now = time.time()
            if symbol in _cache:
                cached_at, data = _cache[symbol]
                if now - cached_at < ttl:
                    return data
            result = func(symbol)
            if result:
                _cache[symbol] = (now, result)
            return result
        return wrapper
    return decorator


def validate_symbol(symbol: str) -> str:
    """Ensure the symbol has a valid Indian exchange suffix."""
    symbol = symbol.upper().strip()
    if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
        symbol += ".NS"
    return symbol


@_ttl_cache(CACHE_TTL)
def fetch_stock_info(symbol: str) -> Optional[StockInfo]:
    """Fetch stock data from yfinance. Returns None on failure."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        if not info or info.get("regularMarketPrice") is None:
            return None

        sector = info.get("sector", "")
        market_cap_inr = info.get("marketCap", 0)
        market_cap_cr = market_cap_inr / 1e7 if market_cap_inr else 0
        eps = info.get("trailingEps", 0) or 0
        eps_growth = info.get("earningsGrowth", 0) or 0
        eps_growth_pct = eps_growth * 100

        exchange = "NSE" if symbol.endswith(".NS") else "BSE"

        lynch_cat = classify_lynch(
            eps_growth=eps_growth_pct,
            market_cap=market_cap_cr,
            sector=sector,
        )

        return StockInfo(
            symbol=symbol,
            name=info.get("longName", info.get("shortName", symbol)),
            exchange=exchange,
            sector=sector,
            industry=info.get("industry", ""),
            market_cap=round(market_cap_cr, 2),
            current_price=info.get("regularMarketPrice", 0),
            pe_ratio=info.get("trailingPE", 0) or 0,
            eps=eps,
            eps_growth=round(eps_growth_pct, 2),
            dividend_yield=round((info.get("dividendYield", 0) or 0) * 100, 2),
            week_52_high=info.get("fiftyTwoWeekHigh", 0) or 0,
            week_52_low=info.get("fiftyTwoWeekLow", 0) or 0,
            lynch_category=lynch_cat.value,
        )
    except Exception:
        logger.exception("yfinance fetch failed for %s", symbol)
        return None
