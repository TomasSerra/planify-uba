from __future__ import annotations

import logging
import os
from pathlib import Path

import firebase_admin
from fastapi import Header, HTTPException
from firebase_admin import auth as fb_auth, credentials
from pydantic import BaseModel

log = logging.getLogger("auth")


class AuthUser(BaseModel):
    id: str


def _credentials_from_env() -> credentials.Certificate | None:
    # Fallback para hosts sin filesystem persistente (Vercel): armar el
    # service account desde variables sueltas. Replicamos los nombres del JSON
    # de Firebase.
    required = ("FIREBASE_PROJECT_ID", "FIREBASE_PRIVATE_KEY", "FIREBASE_CLIENT_EMAIL")
    if not all(os.environ.get(k) for k in required):
        return None
    # Las private keys suelen viajar con \n escapados al pasar por paneles web.
    private_key = os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n")
    sa = {
        "type": os.environ.get("FIREBASE_TYPE", "service_account"),
        "project_id": os.environ["FIREBASE_PROJECT_ID"],
        "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID", ""),
        "private_key": private_key,
        "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
        "client_id": os.environ.get("FIREBASE_CLIENT_ID", ""),
        "auth_uri": os.environ.get(
            "FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"
        ),
        "token_uri": os.environ.get(
            "FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"
        ),
        "auth_provider_x509_cert_url": os.environ.get(
            "FIREBASE_AUTH_PROVIDER_X509_CERT_URL",
            "https://www.googleapis.com/oauth2/v1/certs",
        ),
        "client_x509_cert_url": os.environ.get("FIREBASE_CLIENT_X509_CERT_URL", ""),
        "universe_domain": os.environ.get("FIREBASE_UNIVERSE_DOMAIN", "googleapis.com"),
    }
    return credentials.Certificate(sa)


def _initialize_firebase() -> None:
    if firebase_admin._apps:
        return
    sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_path and Path(sa_path).is_file():
        firebase_admin.initialize_app()
        return
    cred = _credentials_from_env()
    if cred is not None:
        firebase_admin.initialize_app(cred)
        return
    # Último intento: ADC puro (gcloud login, metadata server, etc.).
    firebase_admin.initialize_app()


_initialize_firebase()


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
