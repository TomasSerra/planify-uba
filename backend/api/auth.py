from __future__ import annotations

import os
import time
from typing import Any

import httpx
import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient
from pydantic import BaseModel

CLERK_ISSUER_URL = os.environ.get("CLERK_ISSUER_URL", "").rstrip("/")
JWKS_TTL_SECONDS = 3600

_jwks_client: PyJWKClient | None = None
_jwks_loaded_at: float = 0.0


class ClerkUser(BaseModel):
    id: str


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client, _jwks_loaded_at
    now = time.monotonic()
    if _jwks_client is None or (now - _jwks_loaded_at) > JWKS_TTL_SECONDS:
        if not CLERK_ISSUER_URL:
            raise HTTPException(status_code=500, detail="CLERK_ISSUER_URL no configurada")
        _jwks_client = PyJWKClient(f"{CLERK_ISSUER_URL}/.well-known/jwks.json")
        _jwks_loaded_at = now
    return _jwks_client


def _decode_token(token: str) -> dict[str, Any]:
    client = _get_jwks_client()
    try:
        signing_key = client.get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER_URL,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Token inválido: {exc}") from exc


def current_user(authorization: str = Header(...)) -> ClerkUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header inválido")
    token = authorization.removeprefix("Bearer ").strip()
    payload = _decode_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="JWT sin sub")
    return ClerkUser(id=sub)


def optional_user(authorization: str | None = Header(default=None)) -> ClerkUser | None:
    if not authorization:
        return None
    return current_user(authorization)
