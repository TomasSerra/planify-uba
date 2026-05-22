from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .auth import AuthUser, current_user
from .db import pool
from .models import Me, SubscriptionState, UpdateProfileRequest, UserProfile
from .subs import get_active_until

router = APIRouter()


@router.get("/me", response_model=Me)
def me(user: AuthUser = Depends(current_user)) -> Me:
    with pool.connection() as conn:
        valid_until = get_active_until(conn, user.id)
        carrera_row = conn.execute(
            "SELECT carrera FROM user_profile WHERE uid = %s",
            (user.id,),
        ).fetchone()
    return Me(
        carrera=carrera_row["carrera"] if carrera_row else None,
        subscription=SubscriptionState(
            active=valid_until is not None,
            valid_until=valid_until,
        ),
    )


@router.patch("/me/profile", response_model=UserProfile)
def update_me_profile(
    body: UpdateProfileRequest,
    user: AuthUser = Depends(current_user),
) -> UserProfile:
    with pool.connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM carreras WHERE slug = %s",
            (body.carrera,),
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=400, detail="Carrera inexistente")
        conn.execute(
            """
            INSERT INTO user_profile (uid, carrera)
            VALUES (%s, %s)
            ON CONFLICT (uid) DO UPDATE SET
                carrera    = EXCLUDED.carrera,
                updated_at = NOW()
            """,
            (user.id, body.carrera),
        )
    return UserProfile(carrera=body.carrera)
