"""Auth endpoints: signup and login."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.database import users_col
from app.auth.models import UserCreate, UserLogin, TokenResponse
from app.auth.utils import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(body: UserCreate):
    col = users_col()
    if col.find_one({"username": body.username}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invalid username or password",
        )

    col.insert_one(
        {
            "username": body.username,
            "password_hash": hash_password(body.password),
            "created_at": datetime.now(timezone.utc),
        }
    )

    return TokenResponse(
        access_token=create_token(body.username), username=body.username
    )


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin):
    user = users_col().find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return TokenResponse(
        access_token=create_token(body.username), username=body.username
    )
