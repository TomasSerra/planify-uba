from __future__ import annotations

import logging
import os
import time
from typing import Any

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient
from pydantic import BaseModel

log = logging.getLogger("auth")

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN", "").strip()
AUTH0_AUDIENCE = os.environ.get("AUTH0_AUDIENCE", "").strip()
JWKS_TTL_SECONDS = 3600

_jwks_client: PyJWKClient | None = None
_jwks_loaded_at: float = 0.0


class AuthUser(BaseModel):
    id: str


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client, _jwks_loaded_at
    now = time.monotonic()
    if _jwks_client is None or (now - _jwks_loaded_at) > JWKS_TTL_SECONDS:
        if not AUTH0_DOMAIN:
            raise HTTPException(status_code=500, detail="AUTH0_DOMAIN no configurada")
        if not AUTH0_AUDIENCE:
            raise HTTPException(status_code=500, detail="AUTH0_AUDIENCE no configurada")
        _jwks_client = PyJWKClient(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")
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
            issuer=f"https://{AUTH0_DOMAIN}/",
            audience=AUTH0_AUDIENCE,
        )
    except jwt.PyJWTError as exc:
        log.warning("JWT inválido: %s", exc)
        raise HTTPException(status_code=401, detail="Token inválido") from exc


def current_user(authorization: str = Header(...)) -> AuthUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header inválido")
    token = authorization.removeprefix("Bearer ").strip()
    payload = _decode_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="JWT sin sub")
    return AuthUser(id=sub)


def optional_user(authorization: str | None = Header(default=None)) -> AuthUser | None:
    if not authorization:
        return None
    return current_user(authorization)
