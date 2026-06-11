"""Tests de auth con Firebase mockeado.

Mockeamos `fb_auth.verify_id_token` para no requerir credenciales reales.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from firebase_admin import auth as fb_auth

from api.auth import current_user, optional_user, AuthUser


class TestCurrentUser:
    def test_bearer_valido_devuelve_authuser(self, monkeypatch):
        monkeypatch.setattr(fb_auth, "verify_id_token", lambda token, **kw: {"uid": "user-123"})
        user = current_user(authorization="Bearer abc.def.ghi")
        assert isinstance(user, AuthUser)
        assert user.id == "user-123"

    def test_header_sin_bearer_da_401(self, monkeypatch):
        with pytest.raises(HTTPException) as exc:
            current_user(authorization="abc.def.ghi")
        assert exc.value.status_code == 401

    def test_header_con_basic_da_401(self):
        with pytest.raises(HTTPException) as exc:
            current_user(authorization="Basic dXNlcjpwYXNz")
        assert exc.value.status_code == 401

    def test_invalid_id_token_da_401(self, monkeypatch):
        def boom(token, **kw):
            raise fb_auth.InvalidIdTokenError("malformado")

        monkeypatch.setattr(fb_auth, "verify_id_token", boom)
        with pytest.raises(HTTPException) as exc:
            current_user(authorization="Bearer x.y.z")
        assert exc.value.status_code == 401

    def test_expired_id_token_da_401(self, monkeypatch):
        def boom(token, **kw):
            raise fb_auth.ExpiredIdTokenError("expirado", cause=None)

        monkeypatch.setattr(fb_auth, "verify_id_token", boom)
        with pytest.raises(HTTPException) as exc:
            current_user(authorization="Bearer x.y.z")
        assert exc.value.status_code == 401

    def test_token_sin_uid_ni_user_id_ni_sub_da_401(self, monkeypatch):
        monkeypatch.setattr(fb_auth, "verify_id_token", lambda token, **kw: {"otra_cosa": "x"})
        with pytest.raises(HTTPException) as exc:
            current_user(authorization="Bearer x.y.z")
        assert exc.value.status_code == 401

    def test_acepta_user_id_si_no_hay_uid(self, monkeypatch):
        monkeypatch.setattr(fb_auth, "verify_id_token", lambda token, **kw: {"user_id": "user-456"})
        user = current_user(authorization="Bearer x.y.z")
        assert user.id == "user-456"

    def test_acepta_sub_si_no_hay_uid_ni_user_id(self, monkeypatch):
        monkeypatch.setattr(fb_auth, "verify_id_token", lambda token, **kw: {"sub": "user-789"})
        user = current_user(authorization="Bearer x.y.z")
        assert user.id == "user-789"


class TestOptionalUser:
    def test_sin_header_devuelve_none(self):
        assert optional_user(authorization=None) is None

    def test_con_header_valido_devuelve_authuser(self, monkeypatch):
        monkeypatch.setattr(fb_auth, "verify_id_token", lambda token, **kw: {"uid": "user-99"})
        user = optional_user(authorization="Bearer x.y.z")
        assert user is not None
        assert user.id == "user-99"

    def test_con_header_invalido_da_401(self, monkeypatch):
        monkeypatch.setattr(fb_auth, "verify_id_token", lambda token, **kw: (_ for _ in ()).throw(
            fb_auth.InvalidIdTokenError("no")
        ))
        with pytest.raises(HTTPException) as exc:
            optional_user(authorization="Bearer bad")
        assert exc.value.status_code == 401
