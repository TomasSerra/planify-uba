from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .auth import AuthUser, current_user
from .db import pool


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


class SubscriptionState(BaseModel):
    active: bool
    valid_until: datetime | None


router = APIRouter()


@router.get("/me/subscription", response_model=SubscriptionState)
def me_subscription(user: AuthUser = Depends(current_user)) -> SubscriptionState:
    with pool.connection() as conn:
        valid_until = get_active_until(conn, user.id)
    return SubscriptionState(active=valid_until is not None, valid_until=valid_until)
