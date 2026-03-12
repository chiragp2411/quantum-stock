"""News endpoints."""

from fastapi import APIRouter, Depends, Query

from app.auth.utils import get_current_user
from app.news.service import fetch_news

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("/{symbol}")
def get_news(
    symbol: str,
    limit: int = Query(default=5, ge=1, le=20),
    _user: dict = Depends(get_current_user),
):
    """Fetch recent news for a stock symbol."""
    return {"symbol": symbol, "news": fetch_news(symbol, limit)}
