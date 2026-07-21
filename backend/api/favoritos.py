from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel

from .auth import AuthUser, current_user
from .db import pool
from .planes import Plan, FranjaExcluida
from .subs import has_active_subscription

router = APIRouter()


class FavoriteFilters(BaseModel):
    dias_excluidos: list[str] = []
    franjas_excluidas: list[FranjaExcluida] = []
    sedes_permitidas: list[str] = []
    max_bache_horas: float | None = None
    min_dias_semana: int | None = None
    max_dias_semana: int | None = None
    min_horas_dia: float | None = None
    max_horas_dia: float | None = None
    # Por materia: lo que el usuario tenía elegido (cátedra fija + profesores + sede).
    materias: list[dict] = []


class FavoriteCreate(BaseModel):
    plan: Plan
    filters: FavoriteFilters | None = None


class FavoriteCreateResponse(BaseModel):
    id: int
    created_at: datetime


class Favorite(BaseModel):
    id: int
    plan: Plan
    filters: FavoriteFilters | None = None
    created_at: datetime


class FavoriteList(BaseModel):
    favorites: list[Favorite]


# Ver y borrar los propios favoritos no requiere Pro (un user que dejó de ser
# Pro debería poder seguir viendo y limpiando lo que guardó). Solo crear nuevos
# (POST) sigue siendo Pro.


@router.get("", response_model=FavoriteList)
def list_favorites(user: AuthUser = Depends(current_user)) -> FavoriteList:
    with pool.connection() as conn:
        rows = conn.execute(
            "SELECT id, plan_data, filters_data, created_at FROM favorite_plans "
            "WHERE clerk_user_id = %s ORDER BY created_at DESC",
            (user.id,),
        ).fetchall()
    return FavoriteList(
        favorites=[
            Favorite(
                id=r["id"],
                plan=Plan(**r["plan_data"]),
                filters=(
                    FavoriteFilters(**r["filters_data"]) if r["filters_data"] else None
                ),
                created_at=r["created_at"],
            )
            for r in rows
        ]
    )


@router.post("", response_model=FavoriteCreateResponse)
def create_favorite(
    body: FavoriteCreate,
    user: AuthUser = Depends(current_user),
) -> FavoriteCreateResponse:
    with pool.connection() as conn:
        if not has_active_subscription(conn, user.id):
            raise HTTPException(
                status_code=403,
                detail="Guardar planes en favoritos es una función Pro.",
            )
        row = conn.execute(
            "INSERT INTO favorite_plans (clerk_user_id, plan_data, filters_data) "
            "VALUES (%s, %s, %s) RETURNING id, created_at",
            (
                user.id,
                Jsonb(body.plan.model_dump(mode="json")),
                Jsonb(body.filters.model_dump(mode="json")) if body.filters else None,
            ),
        ).fetchone()
        conn.commit()
    return FavoriteCreateResponse(id=row["id"], created_at=row["created_at"])


@router.delete("/{favorite_id}")
def delete_favorite(
    favorite_id: int,
    user: AuthUser = Depends(current_user),
) -> dict:
    with pool.connection() as conn:
        deleted = conn.execute(
            "DELETE FROM favorite_plans WHERE id = %s AND clerk_user_id = %s",
            (favorite_id, user.id),
        ).rowcount
        conn.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    return {"ok": True}
