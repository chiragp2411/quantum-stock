"""Seed the admin user on first run."""

import bcrypt
from datetime import datetime, timezone

from app.config import settings
from app.database import users_col, ensure_indexes


def seed_admin() -> None:
    ensure_indexes()
    col = users_col()

    existing = col.find_one({"username": "chiragp"})
    if existing:
        if existing.get("role") != "admin":
            col.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin"}})
            print("Admin user 'chiragp' updated — role set to 'admin'.")
        else:
            print("Admin user 'chiragp' already exists (role=admin) — skipping seed.")
        return

    password_hash = bcrypt.hashpw(
        settings.admin_pass.encode("utf-8"), bcrypt.gensalt(rounds=12)
    ).decode("utf-8")

    col.insert_one(
        {
            "username": "chiragp",
            "password_hash": password_hash,
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        }
    )
    print("Admin user 'chiragp' created (role=admin).")


if __name__ == "__main__":
    seed_admin()
