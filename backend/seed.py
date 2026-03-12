"""Seed the admin user on first run."""

import bcrypt
from datetime import datetime, timezone

from app.config import settings
from app.database import users_col, ensure_indexes


def seed_admin() -> None:
    ensure_indexes()
    col = users_col()

    if col.find_one({"username": "chiragp"}):
        print("Admin user 'chiragp' already exists — skipping seed.")
        return

    password_hash = bcrypt.hashpw(
        settings.admin_pass.encode("utf-8"), bcrypt.gensalt(rounds=12)
    ).decode("utf-8")

    col.insert_one(
        {
            "username": "chiragp",
            "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc),
        }
    )
    print("Admin user 'chiragp' created successfully.")


if __name__ == "__main__":
    seed_admin()
