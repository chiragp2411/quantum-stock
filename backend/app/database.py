"""MongoDB client, collection accessors, and GridFS helper."""

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from gridfs import GridFS

from app.config import settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongo_uri)
    return _client


def get_db() -> Database:
    return get_client()[settings.db_name]


def get_gridfs() -> GridFS:
    return GridFS(get_db())


def users_col() -> Collection:
    return get_db()["users"]


def stocks_col() -> Collection:
    return get_db()["stocks"]


def concalls_col() -> Collection:
    return get_db()["concalls"]


def financials_col() -> Collection:
    return get_db()["financials"]


def valuations_col() -> Collection:
    return get_db()["valuations"]


def ensure_indexes() -> None:
    """Create indexes on first startup."""
    users_col().create_index("username", unique=True)
    stocks_col().create_index("symbol", unique=True)
    concalls_col().create_index([("stock_symbol", 1), ("quarter", 1)])
    financials_col().create_index([("stock_symbol", 1), ("period", 1)])
    valuations_col().create_index([("stock_symbol", 1), ("created_at", -1)])
