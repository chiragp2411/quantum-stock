"""Session Notebook: per-stock notes for tracking investment thesis and observations."""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth.utils import get_current_user
from app.database import notes_col

router = APIRouter(prefix="/api/notes", tags=["notes"])


class NoteCreate(BaseModel):
    note_type: str = Field(description="thesis / observation / switch_trigger / quarterly_update")
    content: str = Field(description="Free-text markdown content")
    quarter: Optional[str] = Field(default=None, description="Which quarter this note is about")


class NoteUpdate(BaseModel):
    content: str


@router.get("/{symbol}")
def list_notes(symbol: str):
    """List all notes for a stock, most recent first."""
    symbol = symbol.upper()
    docs = list(notes_col().find({"stock_symbol": symbol}).sort("created_at", -1))
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs


@router.post("/{symbol}")
def create_note(
    symbol: str,
    note: NoteCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new note for a stock."""
    symbol = symbol.upper()
    doc = {
        "stock_symbol": symbol,
        "note_type": note.note_type,
        "content": note.content,
        "quarter": note.quarter,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
        "created_by": user["username"],
    }
    result = notes_col().insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{symbol}/{note_id}")
def update_note(
    symbol: str,
    note_id: str,
    update: NoteUpdate,
    user: dict = Depends(get_current_user),
):
    """Update a note's content."""
    symbol = symbol.upper()
    doc = notes_col().find_one({"_id": ObjectId(note_id), "stock_symbol": symbol})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")

    notes_col().update_one(
        {"_id": ObjectId(note_id)},
        {"$set": {"content": update.content, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "updated", "id": note_id}


@router.delete("/{symbol}/{note_id}")
def delete_note(
    symbol: str,
    note_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a note."""
    symbol = symbol.upper()
    result = notes_col().delete_one({"_id": ObjectId(note_id), "stock_symbol": symbol})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    return {"status": "deleted", "id": note_id}
