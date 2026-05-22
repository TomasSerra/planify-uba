from __future__ import annotations

from datetime import datetime


def has_active_subscription(conn, clerk_user_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM subscriptions "
        "WHERE clerk_user_id = %s AND valid_until > NOW() "
        "LIMIT 1",
        (clerk_user_id,),
    ).fetchone()
    return row is not None


def get_active_until(conn, clerk_user_id: str) -> datetime | None:
    row = conn.execute(
        "SELECT valid_until FROM subscriptions "
        "WHERE clerk_user_id = %s AND valid_until > NOW() "
        "ORDER BY valid_until DESC LIMIT 1",
        (clerk_user_id,),
    ).fetchone()
    return row["valid_until"] if row else None
