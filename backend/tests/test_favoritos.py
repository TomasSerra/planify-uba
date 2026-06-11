"""Tests de favoritos: gating Pro en create, list/delete sin gating Pro,
aislamiento entre usuarios."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from api.auth import AuthUser
from api.favoritos import (
    FavoriteCreate,
    FavoriteFilters,
    create_favorite,
    delete_favorite,
    list_favorites,
)
from api.planes import CursoEnPlan, OpcionMateria, Plan


def _plan_minimo() -> Plan:
    return Plan(
        opciones=[
            OpcionMateria(
                materia_codigo=1,
                materia_nombre="M1",
                catedra_id=10,
                cursos=[
                    CursoEnPlan(id=100, tipo="comision", codigo="01", catedra_id=10),
                ],
            )
        ]
    )


# ----------------------------- create_favorite (Pro gating) -------------------

class TestCreateFavorite:
    def test_sin_sub_da_403(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        monkeypatch.setattr("api.favoritos.has_active_subscription", lambda conn, uid: False)
        body = FavoriteCreate(plan=_plan_minimo())
        with pytest.raises(HTTPException) as exc:
            create_favorite(body, user=AuthUser(id="uid"))
        assert exc.value.status_code == 403
        assert "Pro" in exc.value.detail

    def test_con_sub_inserta(self, monkeypatch, fake_pool, fake_conn):
        now = datetime.now(timezone.utc)
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        monkeypatch.setattr("api.favoritos.has_active_subscription", lambda conn, uid: True)
        fake_conn.on("INSERT INTO favorite_plans", rows=[{"id": 42, "created_at": now}])
        body = FavoriteCreate(plan=_plan_minimo())
        resp = create_favorite(body, user=AuthUser(id="uid"))
        assert resp.id == 42
        assert resp.created_at == now
        assert fake_conn.commits == 1

    def test_con_filters_none(self, monkeypatch, fake_pool, fake_conn):
        # filters=None: el segundo Jsonb param debe ser None.
        captured = {}

        def capture(sql, params):
            if "INSERT INTO favorite_plans" in sql:
                captured["params"] = params

        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        monkeypatch.setattr("api.favoritos.has_active_subscription", lambda conn, uid: True)
        fake_conn.on("INSERT INTO favorite_plans",
                     rows=[{"id": 1, "created_at": datetime.now(timezone.utc)}],
                     side_effect=capture)
        body = FavoriteCreate(plan=_plan_minimo(), filters=None)
        create_favorite(body, user=AuthUser(id="uid"))
        # filters_data position is the 3rd arg (clerk_user_id, plan_data, filters_data)
        assert captured["params"][2] is None

    def test_con_filters_serializa_jsonb(self, monkeypatch, fake_pool, fake_conn):
        captured = {}

        def capture(sql, params):
            if "INSERT INTO favorite_plans" in sql:
                captured["params"] = params

        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        monkeypatch.setattr("api.favoritos.has_active_subscription", lambda conn, uid: True)
        fake_conn.on("INSERT INTO favorite_plans",
                     rows=[{"id": 1, "created_at": datetime.now(timezone.utc)}],
                     side_effect=capture)
        body = FavoriteCreate(plan=_plan_minimo(), filters=FavoriteFilters(sedes_permitidas=["HY"]))
        create_favorite(body, user=AuthUser(id="uid"))
        # filters_data no es None.
        assert captured["params"][2] is not None


# ----------------------------- list_favorites (no requiere Pro) ---------------

class TestListFavorites:
    def test_pro_con_favoritos(self, monkeypatch, fake_pool, fake_conn):
        now = datetime.now(timezone.utc)
        plan = _plan_minimo().model_dump(mode="json")
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("FROM favorite_plans", rows=[
            {"id": 1, "plan_data": plan, "filters_data": None, "created_at": now},
            {"id": 2, "plan_data": plan, "filters_data": None, "created_at": now},
        ])
        resp = list_favorites(user=AuthUser(id="uid"))
        assert len(resp.favorites) == 2

    def test_ex_pro_puede_listar(self, monkeypatch, fake_pool, fake_conn):
        # Regla del código: list NO chequea has_active_subscription.
        # Ex-Pro con favoritos guardados puede seguir viéndolos.
        now = datetime.now(timezone.utc)
        plan = _plan_minimo().model_dump(mode="json")
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("FROM favorite_plans", rows=[
            {"id": 1, "plan_data": plan, "filters_data": None, "created_at": now},
        ])
        # No monkeypatchamos has_active_subscription, pero list_favorites no lo invoca.
        resp = list_favorites(user=AuthUser(id="ex-pro"))
        assert len(resp.favorites) == 1

    def test_sin_favoritos(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("FROM favorite_plans", rows=[])
        resp = list_favorites(user=AuthUser(id="uid"))
        assert resp.favorites == []

    def test_query_filtra_por_clerk_user_id(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("FROM favorite_plans", rows=[])
        list_favorites(user=AuthUser(id="uid-test"))
        sql, params = fake_conn.executed[0]
        assert "clerk_user_id = %s" in sql
        assert params == ("uid-test",)

    def test_roundtrip_plan_data_a_pydantic(self, monkeypatch, fake_pool, fake_conn):
        # plan_data viene como dict (JSONB) → debe deserializarse a Plan correctamente.
        now = datetime.now(timezone.utc)
        plan_dict = _plan_minimo().model_dump(mode="json")
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("FROM favorite_plans", rows=[
            {"id": 7, "plan_data": plan_dict, "filters_data": None, "created_at": now},
        ])
        resp = list_favorites(user=AuthUser(id="uid"))
        assert resp.favorites[0].plan.opciones[0].materia_codigo == 1
        assert resp.favorites[0].plan.opciones[0].cursos[0].id == 100

    def test_filters_data_se_deserializa(self, monkeypatch, fake_pool, fake_conn):
        now = datetime.now(timezone.utc)
        plan_dict = _plan_minimo().model_dump(mode="json")
        filters_dict = FavoriteFilters(sedes_permitidas=["HY", "SI"]).model_dump(mode="json")
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("FROM favorite_plans", rows=[
            {"id": 8, "plan_data": plan_dict, "filters_data": filters_dict, "created_at": now},
        ])
        resp = list_favorites(user=AuthUser(id="uid"))
        assert resp.favorites[0].filters is not None
        assert resp.favorites[0].filters.sedes_permitidas == ["HY", "SI"]


# ----------------------------- delete_favorite --------------------------------

class TestDeleteFavorite:
    def test_id_propio_borra(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("DELETE FROM favorite_plans", rows=[], rowcount=1)
        resp = delete_favorite(favorite_id=5, user=AuthUser(id="uid"))
        assert resp == {"ok": True}
        assert fake_conn.commits == 1

    def test_id_inexistente_da_404(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("DELETE FROM favorite_plans", rows=[], rowcount=0)
        with pytest.raises(HTTPException) as exc:
            delete_favorite(favorite_id=999, user=AuthUser(id="uid"))
        assert exc.value.status_code == 404

    def test_id_de_otro_usuario_da_404(self, monkeypatch, fake_pool, fake_conn):
        # El WHERE incluye clerk_user_id → rowcount=0 → 404.
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("DELETE FROM favorite_plans", rows=[], rowcount=0)
        with pytest.raises(HTTPException) as exc:
            delete_favorite(favorite_id=1, user=AuthUser(id="otro-user"))
        assert exc.value.status_code == 404

    def test_query_incluye_clerk_user_id(self, monkeypatch, fake_pool, fake_conn):
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("DELETE FROM favorite_plans", rows=[], rowcount=1)
        delete_favorite(favorite_id=1, user=AuthUser(id="uid-X"))
        sql, params = fake_conn.executed[0]
        # WHERE id = %s AND clerk_user_id = %s
        assert "clerk_user_id = %s" in sql
        assert params == (1, "uid-X")

    def test_ex_pro_puede_borrar(self, monkeypatch, fake_pool, fake_conn):
        # delete_favorite no chequea has_active_subscription.
        monkeypatch.setattr("api.favoritos.pool", fake_pool)
        fake_conn.on("DELETE FROM favorite_plans", rows=[], rowcount=1)
        resp = delete_favorite(favorite_id=1, user=AuthUser(id="ex-pro"))
        assert resp == {"ok": True}
