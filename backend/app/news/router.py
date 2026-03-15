"""News endpoints."""

from fastapi import APIRouter, Query

from app.news.service import fetch_news

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("/{symbol}")
def get_news(
    symbol: str,
    limit: int = Query(default=5, ge=1, le=20),
):
    """Fetch recent news for a stock symbol. Public endpoint."""
    return {"symbol": symbol, "news": fetch_news(symbol, limit)}
