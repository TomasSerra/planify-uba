"""Tests de /me y /me/profile: lectura de perfil (carrera + nombre) y upsert
parcial con COALESCE (nombre y carrera se pueden setear en pasos separados)."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from api.auth import AuthUser
from api.me import me, update_me_profile
from api.models import UpdateProfileRequest


# ------------------------------- GET /me --------------------------------------

class TestMe:
    def test_perfil_completo(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.me.pool", fake_pool)
        monkeypatch.setattr("api.me.get_active_until", lambda conn, uid: None)
        fake_conn.on(
            "SELECT carrera, nombre FROM user_profile",
            rows=[{"carrera": "licenciatura-psicologia", "nombre": "Juan Pérez"}],
        )
        resp = me(user=AuthUser(id="uid"))
        assert resp.carrera == "licenciatura-psicologia"
        assert resp.nombre == "Juan Pérez"
        assert resp.subscription.active is False

    def test_sin_fila_todo_none(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.me.pool", fake_pool)
        monkeypatch.setattr("api.me.get_active_until", lambda conn, uid: None)
        fake_conn.on("SELECT carrera, nombre FROM user_profile", rows=[])
        resp = me(user=AuthUser(id="uid"))
        assert resp.carrera is None
        assert resp.nombre is None


# --------------------------- PATCH /me/profile --------------------------------

class TestUpdateProfile:
    def test_solo_nombre_no_valida_carrera(self, monkeypatch, fake_pool, fake_conn):
        # No debe consultar la tabla carreras si no vino carrera.
        monkeypatch.setattr("api.me.pool", fake_pool)
        fake_conn.on(
            "INSERT INTO user_profile",
            rows=[{"carrera": None, "nombre": "Ana"}],
        )
        resp = update_me_profile(UpdateProfileRequest(nombre="Ana"), user=AuthUser(id="uid"))
        assert resp.nombre == "Ana"
        assert resp.carrera is None
        # Solo se ejecutó el upsert (no un SELECT a carreras).
        assert all("carreras" not in sql for sql, _ in fake_conn.executed)
        # El nombre viajó como 3er param; carrera como None.
        insert = next(p for sql, p in fake_conn.executed if "INSERT INTO user_profile" in sql)
        assert insert == ("uid", None, "Ana")

    def test_solo_carrera(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.me.pool", fake_pool)
        fake_conn.on("SELECT 1 FROM carreras", rows=[{"?column?": 1}])
        fake_conn.on(
            "INSERT INTO user_profile",
            rows=[{"carrera": "profesorado-psicologia", "nombre": None}],
        )
        resp = update_me_profile(
            UpdateProfileRequest(carrera="profesorado-psicologia"), user=AuthUser(id="uid")
        )
        assert resp.carrera == "profesorado-psicologia"
        assert resp.nombre is None

    def test_carrera_inexistente_400(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.me.pool", fake_pool)
        fake_conn.on("SELECT 1 FROM carreras", rows=[])
        with pytest.raises(HTTPException) as exc:
            update_me_profile(UpdateProfileRequest(carrera="no-existe"), user=AuthUser(id="uid"))
        assert exc.value.status_code == 400

    def test_ambos(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.me.pool", fake_pool)
        fake_conn.on("SELECT 1 FROM carreras", rows=[{"?column?": 1}])
        fake_conn.on(
            "INSERT INTO user_profile",
            rows=[{"carrera": "licenciatura-musicoterapia", "nombre": "Lu"}],
        )
        resp = update_me_profile(
            UpdateProfileRequest(carrera="licenciatura-musicoterapia", nombre="Lu"),
            user=AuthUser(id="uid"),
        )
        assert resp.carrera == "licenciatura-musicoterapia"
        assert resp.nombre == "Lu"


# ----------------------------- validación del body ----------------------------

class TestUpdateProfileRequestValidation:
    def test_payload_vacio_rechaza(self):
        with pytest.raises(ValidationError):
            UpdateProfileRequest()

    def test_nombre_en_blanco_rechaza(self):
        with pytest.raises(ValidationError):
            UpdateProfileRequest(nombre="   ")

    def test_nombre_se_trimea(self):
        assert UpdateProfileRequest(nombre="  Juan  ").nombre == "Juan"

    def test_nombre_se_capa_a_100(self):
        largo = "a" * 250
        assert len(UpdateProfileRequest(nombre=largo).nombre) == 100
