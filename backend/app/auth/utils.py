"""Password hashing, JWT creation/verification, and auth dependency."""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.database import users_col

_security = HTTPBearer()
_security_optional = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(rounds=12)
    ).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(username: str, role: str = "user") -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=settings.jwt_expire_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")


def _resolve_user(token: str) -> Optional[dict]:
    """Validate token and return user dict, or None on any failure."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
    username = payload.get("sub")
    if not username:
        return None
    user = users_col().find_one({"username": username})
    if not user:
        return None
    return {
        "username": user["username"],
        "id": str(user["_id"]),
        "role": user.get("role", "user"),
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    """FastAPI dependency — REQUIRED auth. Raises 401 if not authenticated."""
    payload = decode_token(credentials.credentials)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")
    user = users_col().find_one({"username": username})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return {
        "username": user["username"],
        "id": str(user["_id"]),
        "role": user.get("role", "user"),
    }


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security_optional),
) -> Optional[dict]:
    """FastAPI dependency — OPTIONAL auth. Returns user dict or None."""
    if credentials is None:
        return None
    return _resolve_user(credentials.credentials)
