"""News service stub — placeholder for web search API integration."""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_MOCK_NEWS = [
    {
        "title": "Company reports strong quarterly earnings, beats estimates",
        "source": "Economic Times",
        "url": "https://example.com/news/1",
        "published_at": "2025-01-15T10:30:00Z",
        "summary": "The company reported quarterly results that exceeded analyst expectations, driven by strong demand in core segments.",
        "sentiment": "positive",
    },
    {
        "title": "Management reaffirms full-year guidance during investor meet",
        "source": "Moneycontrol",
        "url": "https://example.com/news/2",
        "published_at": "2025-01-10T14:00:00Z",
        "summary": "During a recent investor meet, the management reaffirmed their growth guidance and highlighted new capacity expansion plans.",
        "sentiment": "positive",
    },
    {
        "title": "Sector faces headwinds from global macro uncertainty",
        "source": "LiveMint",
        "url": "https://example.com/news/3",
        "published_at": "2025-01-08T09:15:00Z",
        "summary": "Industry analysts warn of potential slowdown due to global economic headwinds and currency fluctuations affecting margins.",
        "sentiment": "negative",
    },
]


def fetch_news(symbol: str, limit: int = 5) -> list[dict]:
    """Fetch recent news for a stock.

    Currently returns mock data. Replace with a real web search API
    (e.g., Google Custom Search, NewsAPI, or Serper) for production use.
    """
    clean_symbol = symbol.replace(".NS", "").replace(".BO", "")
    results = []

    for item in _MOCK_NEWS[:limit]:
        results.append({
            **item,
            "symbol": clean_symbol,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        })

    return results
