"""Tests de suscripciones: has_active_subscription, get_active_until,
endpoint /me, y _record_payment (creación/renovación/idempotencia)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from api.auth import AuthUser
from api.me import me as me_handler
from api.pagos import _fees_from_payment, _record_payment, get_pago_status
from api.subs import get_active_until, has_active_subscription


# ----------------------------- has_active_subscription ------------------------

class TestHasActiveSubscription:
    def test_devuelve_true_cuando_hay_row(self, fake_conn):
        # La query filtra `valid_until > NOW()` en SQL, así que cualquier row implica activa.
        fake_conn.on("from subscriptions", rows=[{"?column?": 1}])
        assert has_active_subscription(fake_conn, "user-A") is True

    def test_devuelve_false_cuando_no_hay_row(self, fake_conn):
        # Sub expirada o ausente: la query no devuelve nada.
        fake_conn.on("from subscriptions", rows=[])
        assert has_active_subscription(fake_conn, "user-A") is False

    def test_pasa_clerk_user_id_a_query(self, fake_conn):
        fake_conn.on("from subscriptions", rows=[])
        has_active_subscription(fake_conn, "user-XYZ")
        sql, params = fake_conn.executed[0]
        assert params == ("user-XYZ",)
        assert "clerk_user_id = %s" in sql
        assert "valid_until > NOW()" in sql


# ----------------------------- get_active_until -------------------------------

class TestGetActiveUntil:
    def test_devuelve_valid_until_cuando_hay_sub(self, fake_conn):
        future = datetime(2030, 1, 1, tzinfo=timezone.utc)
        fake_conn.on("from subscriptions", rows=[{"valid_until": future}])
        assert get_active_until(fake_conn, "user-A") == future

    def test_devuelve_none_sin_sub(self, fake_conn):
        fake_conn.on("from subscriptions", rows=[])
        assert get_active_until(fake_conn, "user-A") is None

    def test_query_ordena_por_valid_until_desc(self, fake_conn):
        # Confirma que la query usa ORDER BY valid_until DESC para devolver la más lejana
        # (importante para renovaciones encadenadas).
        future = datetime(2030, 1, 1, tzinfo=timezone.utc)
        fake_conn.on("from subscriptions", rows=[{"valid_until": future}])
        get_active_until(fake_conn, "user-A")
        sql, _ = fake_conn.executed[0]
        assert "ORDER BY valid_until DESC" in sql


# ----------------------------- /me endpoint -----------------------------------

class TestMeEndpoint:
    def test_me_sin_sub(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.me.pool", fake_pool)
        monkeypatch.setattr("api.me.get_active_until", lambda conn, uid: None)
        fake_conn.on("from user_profile", rows=[])
        resp = me_handler(user=AuthUser(id="uid"))
        assert resp.subscription.active is False
        assert resp.subscription.valid_until is None
        assert resp.carrera is None

    def test_me_con_sub_activa(self, monkeypatch, fake_pool, fake_conn):
        future = datetime(2030, 6, 1, tzinfo=timezone.utc)
        monkeypatch.setattr("api.me.pool", fake_pool)
        monkeypatch.setattr("api.me.get_active_until", lambda conn, uid: future)
        fake_conn.on("from user_profile", rows=[{"carrera": "psicologia", "nombre": "Juan"}])
        resp = me_handler(user=AuthUser(id="uid"))
        assert resp.subscription.active is True
        assert resp.subscription.valid_until == future
        assert resp.carrera == "psicologia"

    def test_me_carrera_none_si_no_hay_perfil(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.me.pool", fake_pool)
        monkeypatch.setattr("api.me.get_active_until", lambda conn, uid: None)
        fake_conn.on("from user_profile", rows=[])
        resp = me_handler(user=AuthUser(id="uid"))
        assert resp.carrera is None


# ----------------------------- _record_payment --------------------------------

def _payment(status="approved", clerk_user_id="user-X", external_ref="ext-1", payment_id=12345, amount=3000, key="clerk_user_id", fee_details=None, net=None):
    pago = {
        "id": payment_id,
        "status": status,
        "external_reference": external_ref,
        "transaction_amount": amount,
        "metadata": {key: clerk_user_id} if clerk_user_id else {},
    }
    if fee_details is not None:
        pago["fee_details"] = fee_details
    if net is not None:
        pago["transaction_details"] = {"net_received_amount": net}
    return pago


class TestRecordPayment:
    def test_pago_aprobado_inserta_sub(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[])  # idempotencia: no existe
        fake_conn.on("WHERE clerk_user_id = %s AND valid_until > NOW()", rows=[])  # sin sub activa
        fake_conn.on("INSERT INTO subscriptions", rows=[])
        fake_conn.on("DELETE FROM pending_checkouts", rows=[])
        _record_payment(_payment())
        sqls = [sql for sql, _ in fake_conn.executed]
        assert any("INSERT INTO subscriptions" in s for s in sqls)
        assert any("DELETE FROM pending_checkouts" in s for s in sqls)
        assert fake_conn.commits >= 1

    def test_status_rejected_no_inserta(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        _record_payment(_payment(status="rejected"))
        assert fake_conn.executed == []

    def test_status_pending_no_inserta(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        _record_payment(_payment(status="pending"))
        assert fake_conn.executed == []

    def test_sin_clerk_user_id_no_inserta(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        _record_payment(_payment(clerk_user_id=None))
        assert fake_conn.executed == []

    def test_sin_external_reference_no_inserta(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        pago = _payment()
        pago["external_reference"] = None
        _record_payment(pago)
        assert fake_conn.executed == []

    def test_idempotencia_por_payment_id(self, monkeypatch, fake_pool, fake_conn):
        # Si ya hay una row con ese mp_payment_id, no se inserta.
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[{"?column?": 1}])
        _record_payment(_payment())
        sqls = [sql for sql, _ in fake_conn.executed]
        assert not any("INSERT INTO subscriptions" in s for s in sqls)

    def test_renovacion_extiende_desde_valid_until_actual(self, monkeypatch, fake_pool, fake_conn):
        future = datetime(2030, 1, 1, tzinfo=timezone.utc)
        captured = {}

        def capture_insert(sql, params):
            if "INSERT INTO subscriptions" in sql:
                captured["sql"] = sql
                captured["params"] = params

        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[])
        fake_conn.on(
            "WHERE clerk_user_id = %s AND valid_until > NOW()",
            rows=[{"valid_until": future}],
        )
        fake_conn.on("INSERT INTO subscriptions", rows=[], side_effect=capture_insert)
        fake_conn.on("DELETE FROM pending_checkouts", rows=[])
        _record_payment(_payment())
        # Rama de renovación: el SQL debe usar `valid_from = sub.valid_until + interval`.
        assert "(%s || ' days')::interval" in captured["sql"]
        # Y el segundo param posicional (valid_from) debe ser el valid_until existente.
        assert future in captured["params"]

    def test_metadata_camelcase_tambien_funciona(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[])
        fake_conn.on("WHERE clerk_user_id", rows=[])
        fake_conn.on("INSERT INTO subscriptions", rows=[])
        fake_conn.on("DELETE FROM pending_checkouts", rows=[])
        _record_payment(_payment(key="clerkUserId"))
        sqls = [sql for sql, _ in fake_conn.executed]
        assert any("INSERT INTO subscriptions" in s for s in sqls)


# ----------------------------- comisión de MP ---------------------------------

class TestFeesFromPayment:
    def test_suma_solo_fees_del_collector(self):
        fee, net, raw = _fees_from_payment(
            _payment(
                fee_details=[
                    {"type": "mercadopago_fee", "amount": 186.5, "fee_payer": "collector"},
                    {"type": "application_fee", "amount": 13.5, "fee_payer": "collector"},
                    # La financiación en cuotas la paga el comprador: no nos descuenta nada.
                    {"type": "financing_fee", "amount": 500, "fee_payer": "payer"},
                ],
                net=2800.0,
            )
        )
        assert fee == 200.0
        assert net == 2800.0
        assert len(raw) == 3

    def test_sin_fee_details_devuelve_none(self):
        # None ≠ 0: no queremos registrar "comisión cero" cuando MP no informó nada.
        fee, net, raw = _fees_from_payment(_payment())
        assert fee is None
        assert net is None
        assert raw is None

    def test_fee_details_vacio_devuelve_none(self):
        fee, _, raw = _fees_from_payment(_payment(fee_details=[]))
        assert fee is None
        assert raw is None

    def test_solo_fees_del_payer_devuelve_cero(self):
        # Hubo fee_details pero ninguna a nuestro cargo: 0 es el dato real.
        fee, _, raw = _fees_from_payment(
            _payment(fee_details=[{"type": "financing_fee", "amount": 500, "fee_payer": "payer"}])
        )
        assert fee == 0
        assert raw is not None


class TestRecordPaymentFees:
    def _capture_insert(self, fake_conn):
        captured = {}

        def capture(sql, params):
            if "INSERT INTO subscriptions" in sql:
                captured["params"] = params

        fake_conn.on("INSERT INTO subscriptions", rows=[], side_effect=capture)
        return captured

    def test_guarda_fee_y_neto_en_alta(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[])
        fake_conn.on("WHERE clerk_user_id = %s AND valid_until > NOW()", rows=[])
        captured = self._capture_insert(fake_conn)
        fake_conn.on("DELETE FROM pending_checkouts", rows=[])
        _record_payment(
            _payment(
                fee_details=[{"type": "mercadopago_fee", "amount": 200.0, "fee_payer": "collector"}],
                net=2800.0,
            )
        )
        assert 200.0 in captured["params"]
        assert 2800.0 in captured["params"]

    def test_guarda_fee_y_neto_en_renovacion(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[])
        fake_conn.on(
            "WHERE clerk_user_id = %s AND valid_until > NOW()",
            rows=[{"valid_until": datetime(2030, 1, 1, tzinfo=timezone.utc)}],
        )
        captured = self._capture_insert(fake_conn)
        fake_conn.on("DELETE FROM pending_checkouts", rows=[])
        _record_payment(
            _payment(
                fee_details=[{"type": "mercadopago_fee", "amount": 200.0, "fee_payer": "collector"}],
                net=2800.0,
            )
        )
        assert 200.0 in captured["params"]
        assert 2800.0 in captured["params"]

    def test_guarda_fee_aunque_falte_el_neto(self, monkeypatch, fake_pool, fake_conn):
        # Un campo nulo de MP no debe arrastrar a los otros: lo que vino se guarda.
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[])
        fake_conn.on("WHERE clerk_user_id = %s AND valid_until > NOW()", rows=[])
        captured = self._capture_insert(fake_conn)
        fake_conn.on("DELETE FROM pending_checkouts", rows=[])
        _record_payment(
            _payment(
                fee_details=[{"type": "mercadopago_fee", "amount": 200.0, "fee_payer": "collector"}]
            )
        )
        fee, net, raw = captured["params"][-3:]
        assert fee == 200.0
        assert net is None
        assert raw is not None

    def test_guarda_el_neto_aunque_falten_los_fee_details(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[])
        fake_conn.on("WHERE clerk_user_id = %s AND valid_until > NOW()", rows=[])
        captured = self._capture_insert(fake_conn)
        fake_conn.on("DELETE FROM pending_checkouts", rows=[])
        _record_payment(_payment(net=2800.0))
        fee, net, raw = captured["params"][-3:]
        assert fee is None
        assert net == 2800.0
        assert raw is None

    def test_amount_de_fee_nulo_no_rompe_la_suma(self):
        fee, _, _ = _fees_from_payment(
            _payment(
                fee_details=[
                    {"type": "mercadopago_fee", "amount": None, "fee_payer": "collector"},
                    {"type": "application_fee", "amount": 50.0, "fee_payer": "collector"},
                ]
            )
        )
        assert fee == 50.0

    def test_sin_fee_details_inserta_nulls(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("WHERE mp_payment_id", rows=[])
        fake_conn.on("WHERE clerk_user_id = %s AND valid_until > NOW()", rows=[])
        captured = self._capture_insert(fake_conn)
        fake_conn.on("DELETE FROM pending_checkouts", rows=[])
        _record_payment(_payment())
        # Los 3 últimos params son fee, neto y el JSON crudo.
        assert captured["params"][-3:] == (None, None, None)


# ----------------------------- /pagos/{ref}/status ----------------------------

class TestPagoStatus:
    def test_con_sub_aprobado(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("FROM subscriptions WHERE mp_external_reference", rows=[{"?column?": 1}])
        resp = get_pago_status("ext-1")
        assert resp.status == "approved"

    def test_sin_sub_pending(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.pagos.pool", fake_pool)
        fake_conn.on("FROM subscriptions WHERE mp_external_reference", rows=[])
        resp = get_pago_status("ext-1")
        assert resp.status == "pending"
