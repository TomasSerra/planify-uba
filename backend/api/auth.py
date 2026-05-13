from __future__ import annotations

import logging

import firebase_admin
from fastapi import Header, HTTPException
from firebase_admin import auth as fb_auth
from pydantic import BaseModel

log = logging.getLogger("auth")


class AuthUser(BaseModel):
    id: str


# Inicialización con Application Default Credentials. El SDK lee
# GOOGLE_APPLICATION_CREDENTIALS (path al service-account JSON). Una sola
# app global; idempotente ante imports duplicados.
if not firebase_admin._apps:
    firebase_admin.initialize_app()


def _decode_token(token: str) -> dict:
    try:
        return fb_auth.verify_id_token(token, check_revoked=False)
    except (fb_auth.InvalidIdTokenError, fb_auth.ExpiredIdTokenError, ValueError) as exc:
        log.warning("Firebase token inválido: %s", exc)
        raise HTTPException(status_code=401, detail="Token inválido") from exc


def current_user(authorization: str = Header(...)) -> AuthUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header inválido")
    token = authorization.removeprefix("Bearer ").strip()
    decoded = _decode_token(token)
    uid = decoded.get("uid") or decoded.get("user_id") or decoded.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="JWT sin uid")
    return AuthUser(id=uid)


def optional_user(authorization: str | None = Header(default=None)) -> AuthUser | None:
    if not authorization:
        return None
    return current_user(authorization)
