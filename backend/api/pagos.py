from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
import uuid
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from .auth import AuthUser, current_user
from .db import pool

log = logging.getLogger("pagos")

MP_ACCESS_TOKEN = os.environ.get("MP_ACCESS_TOKEN", "")
MP_WEBHOOK_SECRET = os.environ.get("MP_WEBHOOK_SECRET", "")
# Bypass DEV-ONLY de la verificación de firma. La verdad del pago sigue saliendo
# del re-fetch a la MP API (auth con MP_ACCESS_TOKEN) + idempotencia por
# mp_payment_id. NO prender en producción.
MP_SKIP_SIGNATURE = os.environ.get("MP_SKIP_SIGNATURE", "") == "1"
APP_URL = os.environ.get("APP_URL", "http://localhost:5173").rstrip("/")
APP_URL_BACKEND = os.environ.get("APP_URL_BACKEND", "http://localhost:8000").rstrip("/")
SUBSCRIPTION_PRICE_ARS = float(os.environ.get("SUBSCRIPTION_PRICE_ARS", "3000"))
SUBSCRIPTION_DAYS = int(os.environ.get("SUBSCRIPTION_DAYS", "90"))

MP_API = "https://api.mercadopago.com"

_mp_client = httpx.Client(timeout=15.0)


def _mp_headers() -> dict[str, str]:
    if not MP_ACCESS_TOKEN:
        raise HTTPException(status_code=500, detail="MP_ACCESS_TOKEN no configurado")
    return {"Authorization": f"Bearer {MP_ACCESS_TOKEN}"}


router = APIRouter()


class CheckoutResponse(BaseModel):
    init_point: str
    external_reference: str


class CheckoutRequest(BaseModel):
    # "redirect" = pago desde compu, auto_return aprobado → MP redirige al sitio.
    # "qr" = pago escaneando QR desde el celu, sin auto_return → MP se queda en
    # la pantalla de comprobante y no manda al user de vuelta (el desktop ya se
    # entera del pago vía polling de /pagos/{ref}/status).
    flow: Literal["redirect", "qr"] = "redirect"


@router.post("/checkout", response_model=CheckoutResponse)
def post_checkout(
    req: CheckoutRequest | None = None,
    user: AuthUser = Depends(current_user),
) -> CheckoutResponse:
    flow = (req.flow if req else "redirect")
    external_reference = uuid.uuid4().hex
    body = {
        "items": [
            {
                "title": f"Planify Pro - {SUBSCRIPTION_DAYS // 30} meses",
                "quantity": 1,
                "unit_price": SUBSCRIPTION_PRICE_ARS,
                "currency_id": "ARS",
            }
        ],
        "external_reference": external_reference,
        "metadata": {"clerk_user_id": user.id},
        "back_urls": {
            "success": f"{APP_URL}/pago-exitoso?ref={external_reference}",
            "failure": f"{APP_URL}/pago-error",
            "pending": f"{APP_URL}/pago-exitoso?ref={external_reference}",
        },
        # auto_return solo en flow=redirect (y solo si APP_URL es https; en dev
        # MP rechaza la preference porque los back_urls no son públicos). En
        # flow=qr lo omitimos a propósito: el celu se queda en MP tras pagar.
        **(
            {"auto_return": "approved"}
            if flow == "redirect" and APP_URL.startswith("https://")
            else {}
        ),
        "notification_url": f"{APP_URL_BACKEND}/pagos/webhook",
    }
    res = _mp_client.post(
        f"{MP_API}/checkout/preferences",
        json=body,
        headers=_mp_headers(),
    )
    if res.status_code >= 400:
        log.error("MP preference creation failed: %s %s", res.status_code, res.text)
        raise HTTPException(status_code=502, detail="No se pudo crear la preferencia de pago")
    data = res.json()
    init_point = data["init_point"]
    # Persistimos el init_point para que el QR pueda apuntar a /pago-qr/{ref}
    # en nuestro dominio y redirigir desde ahí. Si codificamos la init_point
    # directo en el QR, escanear con la app de MP procesa el pago in-app y
    # nunca dispara el webhook.
    with pool.connection() as conn:
        conn.execute(
            "INSERT INTO pending_checkouts (external_reference, init_point) VALUES (%s, %s)",
            (external_reference, init_point),
        )
        conn.commit()
    return CheckoutResponse(init_point=init_point, external_reference=external_reference)


# MP reintenta webhooks por hasta ~24 h. La protección anti-replay real es la
# idempotencia por mp_payment_id en _record_payment; el ts es defense-in-depth.
SIGNATURE_MAX_AGE_SECONDS = 24 * 3600


def _verify_mp_signature(
    *,
    data_id: str,
    signature_header: str | None,
    request_id: str | None,
) -> bool:
    if MP_SKIP_SIGNATURE:
        log.warning("MP_SKIP_SIGNATURE=1 — saltando verificación (DEV ONLY)")
        return True
    if not MP_WEBHOOK_SECRET:
        # Fail-closed: en lugar de aceptar todo silenciosamente cuando falta el
        # secret, abortamos con 500 para que el deploy sea evidente.
        raise HTTPException(
            status_code=500,
            detail="MP_WEBHOOK_SECRET no configurado",
        )
    if not signature_header:
        log.warning("MP webhook sin x-signature header")
        return False
    if not request_id:
        log.warning("MP webhook sin x-request-id header")
        return False
    parts = dict(p.strip().split("=", 1) for p in signature_header.split(",") if "=" in p)
    ts = parts.get("ts")
    v1 = parts.get("v1")
    if not ts or not v1:
        log.warning("x-signature mal formado: %r", signature_header)
        return False
    try:
        ts_int = int(ts)
    except ValueError:
        log.warning("ts no numérico: %r", ts)
        return False
    # MP firma con timestamp en milisegundos.
    ts_seconds = ts_int / 1000 if ts_int > 1_000_000_000_000 else ts_int
    age = time.time() - ts_seconds
    if abs(age) > SIGNATURE_MAX_AGE_SECONDS:
        log.warning("ts fuera de ventana (age=%.0fs, max=%ds)", age, SIGNATURE_MAX_AGE_SECONDS)
        return False
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    expected = hmac.new(
        MP_WEBHOOK_SECRET.encode(),
        manifest.encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, v1):
        log.warning(
            "HMAC no matchea\n  manifest=%r\n  v1_recibido=%s\n  v1_esperado=%s\n  secret_len=%d secret_first4=%s secret_last4=%s",
            manifest, v1, expected,
            len(MP_WEBHOOK_SECRET), MP_WEBHOOK_SECRET[:4], MP_WEBHOOK_SECRET[-4:],
        )
        return False
    return True


def _record_payment(payment: dict) -> None:
    if payment.get("status") != "approved":
        log.info("Pago no aprobado (status=%s) — ignorando", payment.get("status"))
        return
    metadata = payment.get("metadata") or {}
    # MP a veces snake_case-a el metadata. Probamos ambas variantes.
    clerk_user_id = metadata.get("clerk_user_id") or metadata.get("clerkUserId")
    external_reference = payment.get("external_reference")
    payment_id = str(payment.get("id"))
    amount = payment.get("transaction_amount")
    if not clerk_user_id or not external_reference:
        log.error("Pago aprobado sin metadata.clerk_user_id o external_reference: %s", payment_id)
        return

    with pool.connection() as conn:
        # Idempotencia: si ya procesamos este payment_id o este external_reference,
        # no volver a aplicar (MP reintenta webhooks).
        already = conn.execute(
            "SELECT 1 FROM subscriptions "
            "WHERE mp_payment_id = %s OR mp_external_reference = %s LIMIT 1",
            (payment_id, external_reference),
        ).fetchone()
        if already:
            log.info("Pago ya procesado (payment_id=%s) — ignorando", payment_id)
            return
        existing = conn.execute(
            "SELECT valid_until FROM subscriptions "
            "WHERE clerk_user_id = %s AND valid_until > NOW() "
            "ORDER BY valid_until DESC LIMIT 1",
            (clerk_user_id,),
        ).fetchone()
        if existing:
            # Renovación: extender desde la sub activa actual.
            conn.execute(
                """
                INSERT INTO subscriptions
                    (clerk_user_id, valid_from, valid_until,
                     mp_payment_id, mp_external_reference, amount_ars)
                VALUES (%s, %s, %s + (%s || ' days')::interval, %s, %s, %s)
                ON CONFLICT (mp_external_reference) DO NOTHING
                """,
                (
                    clerk_user_id,
                    existing["valid_until"],
                    existing["valid_until"],
                    SUBSCRIPTION_DAYS,
                    payment_id,
                    external_reference,
                    amount,
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO subscriptions
                    (clerk_user_id, valid_from, valid_until,
                     mp_payment_id, mp_external_reference, amount_ars)
                VALUES (%s, NOW(), NOW() + (%s || ' days')::interval, %s, %s, %s)
                ON CONFLICT (mp_external_reference) DO NOTHING
                """,
                (
                    clerk_user_id,
                    SUBSCRIPTION_DAYS,
                    payment_id,
                    external_reference,
                    amount,
                ),
            )
        conn.execute(
            "DELETE FROM pending_checkouts WHERE external_reference = %s",
            (external_reference,),
        )
        conn.commit()


@router.post("/webhook")
def post_webhook(
    request: Request,
    body: dict,
    x_signature: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None),
):
    # MP manda dos sistemas en paralelo: el webhook moderno (query ?data.id=…&type=…,
    # firmado con MP_WEBHOOK_SECRET) y el IPN legacy (?id=…&topic=…, firmado con otra
    # clave heredada que no controlamos). El moderno ya cubre todos los eventos, así
    # que descartamos el IPN antes de tocar la firma — si no, tira 401 ruidoso.
    if "topic" in request.query_params:
        return {"ok": True}
    type_ = body.get("type") or request.query_params.get("type")
    data_id = (
        (body.get("data") or {}).get("id")
        or request.query_params.get("data.id")
        or body.get("id")
    )
    if type_ != "payment" or not data_id:
        return {"ok": True}

    if not _verify_mp_signature(
        data_id=str(data_id),
        signature_header=x_signature,
        request_id=x_request_id,
    ):
        log.warning("Firma MP inválida")
        raise HTTPException(status_code=401, detail="Firma inválida")

    res = _mp_client.get(f"{MP_API}/v1/payments/{data_id}", headers=_mp_headers())
    if res.status_code >= 400:
        log.error("MP fetch payment failed: %s %s", res.status_code, res.text)
        raise HTTPException(status_code=502, detail="No se pudo consultar el pago")
    _record_payment(res.json())
    return {"ok": True}


class PagoStatus(BaseModel):
    status: Literal["pending", "approved"]


@router.get("/{external_reference}/status", response_model=PagoStatus)
def get_pago_status(external_reference: str) -> PagoStatus:
    with pool.connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM subscriptions WHERE mp_external_reference = %s LIMIT 1",
            (external_reference,),
        ).fetchone()
    return PagoStatus(status="approved" if row else "pending")


@router.get("/qr/{external_reference}")
def get_pago_qr_redirect(external_reference: str) -> RedirectResponse:
    # Target del QR de pago mobile: 302 directo a la init_point de MP. Server-
    # side y no client-side — un redirect programático desde React rompe el
    # render de la checkout de MP (CSP nonce mismatch). Con un 302 nativo MP
    # ve la nav como un click normal.
    with pool.connection() as conn:
        row = conn.execute(
            "SELECT init_point FROM pending_checkouts WHERE external_reference = %s",
            (external_reference,),
        ).fetchone()
    if not row:
        return RedirectResponse(url=f"{APP_URL}/pago-error", status_code=302)
    return RedirectResponse(url=row["init_point"], status_code=302)
