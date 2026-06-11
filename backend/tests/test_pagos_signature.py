"""Tests de _verify_mp_signature: el anti-fraude del webhook de Mercado Pago."""

from __future__ import annotations

import hashlib
import hmac
import time

import pytest
from fastapi import HTTPException

from api import pagos
from api.pagos import _verify_mp_signature


SECRET = "test-secret-for-hmac"


def _sign(data_id: str, request_id: str, ts: int | str, secret: str = SECRET) -> str:
    """Calcula la firma como la mandaría MP."""
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    v1 = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={v1}"


@pytest.fixture
def with_secret(monkeypatch):
    monkeypatch.setattr(pagos, "MP_WEBHOOK_SECRET", SECRET)
    monkeypatch.setattr(pagos, "MP_SKIP_SIGNATURE", False)


class TestVerifyMpSignature:
    def test_hmac_valido_pasa(self, with_secret):
        ts = int(time.time())
        sig = _sign("12345", "req-1", ts)
        assert _verify_mp_signature(data_id="12345", signature_header=sig, request_id="req-1") is True

    def test_hmac_tampered_falla(self, with_secret):
        ts = int(time.time())
        sig = _sign("12345", "req-1", ts)
        # Cambiar el último char del v1.
        tampered = sig[:-1] + ("a" if sig[-1] != "a" else "b")
        assert _verify_mp_signature(data_id="12345", signature_header=tampered, request_id="req-1") is False

    def test_data_id_diferente_falla(self, with_secret):
        # Firma calculada para data_id=12345 pero pasada para 99999.
        ts = int(time.time())
        sig = _sign("12345", "req-1", ts)
        assert _verify_mp_signature(data_id="99999", signature_header=sig, request_id="req-1") is False

    def test_request_id_diferente_falla(self, with_secret):
        ts = int(time.time())
        sig = _sign("12345", "req-A", ts)
        assert _verify_mp_signature(data_id="12345", signature_header=sig, request_id="req-B") is False

    def test_secret_diferente_falla(self, with_secret):
        ts = int(time.time())
        sig = _sign("12345", "req-1", ts, secret="otro-secret")
        assert _verify_mp_signature(data_id="12345", signature_header=sig, request_id="req-1") is False

    def test_sin_signature_header_falla(self, with_secret):
        assert _verify_mp_signature(data_id="12345", signature_header=None, request_id="req-1") is False

    def test_sin_request_id_falla(self, with_secret):
        ts = int(time.time())
        sig = _sign("12345", "req-1", ts)
        assert _verify_mp_signature(data_id="12345", signature_header=sig, request_id=None) is False

    def test_signature_malformado_falla(self, with_secret):
        # Sin separador, sin ts, sin v1.
        assert _verify_mp_signature(data_id="12345", signature_header="garbage", request_id="req-1") is False
        assert _verify_mp_signature(data_id="12345", signature_header="ts=123", request_id="req-1") is False
        assert _verify_mp_signature(data_id="12345", signature_header="v1=abc", request_id="req-1") is False

    def test_ts_no_numerico_falla(self, with_secret):
        sig = "ts=notanumber,v1=abc"
        assert _verify_mp_signature(data_id="12345", signature_header=sig, request_id="req-1") is False

    def test_ts_en_milisegundos_funciona(self, with_secret):
        # MP a veces firma con ts en ms (>1e12). El código lo detecta y normaliza.
        ts_ms = int(time.time() * 1000)
        sig = _sign("12345", "req-1", ts_ms)
        assert _verify_mp_signature(data_id="12345", signature_header=sig, request_id="req-1") is True

    def test_ts_viejo_falla(self, with_secret):
        # ts hace 48h → fuera de ventana (24h).
        ts_old = int(time.time()) - 48 * 3600
        sig = _sign("12345", "req-1", ts_old)
        assert _verify_mp_signature(data_id="12345", signature_header=sig, request_id="req-1") is False

    def test_ts_futuro_lejano_falla(self, with_secret):
        # ts dentro de 48h: también fuera de ventana (abs(age) > max).
        ts_future = int(time.time()) + 48 * 3600
        sig = _sign("12345", "req-1", ts_future)
        assert _verify_mp_signature(data_id="12345", signature_header=sig, request_id="req-1") is False

    def test_mp_skip_signature_pasa_sin_chequear(self, monkeypatch):
        monkeypatch.setattr(pagos, "MP_SKIP_SIGNATURE", True)
        # Aunque todo esté roto, devuelve True.
        assert _verify_mp_signature(data_id="x", signature_header=None, request_id=None) is True

    def test_sin_webhook_secret_da_500(self, monkeypatch):
        monkeypatch.setattr(pagos, "MP_SKIP_SIGNATURE", False)
        monkeypatch.setattr(pagos, "MP_WEBHOOK_SECRET", "")
        with pytest.raises(HTTPException) as exc:
            _verify_mp_signature(data_id="12345", signature_header="ts=1,v1=x", request_id="r")
        assert exc.value.status_code == 500

    def test_compare_digest_constant_time(self, with_secret):
        # Test simbólico: la implementación usa hmac.compare_digest (no `==`).
        # Verificamos que dos hashes que difieren en el último char den False.
        ts = int(time.time())
        sig = _sign("12345", "req-1", ts)
        # Tomar el v1 y modificar el primer char.
        parts = dict(p.split("=", 1) for p in sig.split(","))
        bad_v1 = ("0" if parts["v1"][0] != "0" else "1") + parts["v1"][1:]
        bad_sig = f"ts={parts['ts']},v1={bad_v1}"
        assert _verify_mp_signature(data_id="12345", signature_header=bad_sig, request_id="req-1") is False
