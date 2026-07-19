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
        profile_row = conn.execute(
            "SELECT carrera, nombre FROM user_profile WHERE uid = %s",
            (user.id,),
        ).fetchone()
    return Me(
        carrera=profile_row["carrera"] if profile_row else None,
        nombre=profile_row["nombre"] if profile_row else None,
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
        if body.carrera is not None:
            exists = conn.execute(
                "SELECT 1 FROM carreras WHERE slug = %s",
                (body.carrera,),
            ).fetchone()
            if exists is None:
                raise HTTPException(status_code=400, detail="Carrera inexistente")
        # COALESCE: solo pisa los campos provistos, deja intactos los que vienen
        # en None (permite setear nombre y carrera en pasos separados).
        row = conn.execute(
            """
            INSERT INTO user_profile (uid, carrera, nombre)
            VALUES (%s, %s, %s)
            ON CONFLICT (uid) DO UPDATE SET
                carrera    = COALESCE(EXCLUDED.carrera, user_profile.carrera),
                nombre     = COALESCE(EXCLUDED.nombre, user_profile.nombre),
                updated_at = NOW()
            RETURNING carrera, nombre
            """,
            (user.id, body.carrera, body.nombre),
        ).fetchone()
    return UserProfile(carrera=row["carrera"], nombre=row["nombre"])
