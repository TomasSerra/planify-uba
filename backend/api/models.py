from __future__ import annotations

from datetime import datetime, time
from typing import Literal

from pydantic import BaseModel, field_validator, model_validator


class CursoSummary(BaseModel):
    id: int
    tipo: str
    codigo: str
    dia: str | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    aula: str | None = None


class CursoResponse(BaseModel):
    id: int
    catedra_id: int
    tipo: str
    codigo: str
    dia: str | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    profesor: str | None = None
    vacantes: int | None = None
    obligatorio: str | None = None
    aula: str | None = None
    sede: str | None = None
    observaciones: str | None = None
    # None para cursos no-comisión; lista (posiblemente vacía) para comisiones.
    # En /cursos solo se popula cuando se pide ?incluir=obliga.
    obliga_a: list[CursoSummary] | None = None


class CursoListItem(CursoResponse):
    materia_codigo: int
    materia_nombre: str


class CatedraSummary(BaseModel):
    id: int
    numero: str | None = None
    titular: str | None = None
    cuatrimestre: str | None = None


class CatedraDetail(BaseModel):
    id: int
    materia_codigo: int
    materia_nombre: str
    numero: str | None = None
    titular: str | None = None
    cuatrimestre: str | None = None
    cursos: list[CursoResponse]


class MateriaListItem(BaseModel):
    codigo: int
    nombre: str
    cant_catedras: int


class MateriaDetail(BaseModel):
    codigo: int
    nombre: str
    catedras: list[CatedraSummary]


class ComisionOpcion(BaseModel):
    profesor: str | None = None
    sede: str | None = None


class CatedraOpcion(BaseModel):
    id: int
    numero: str | None = None
    titular: str | None = None
    cuatrimestre: str | None = None
    profesores: list[str]  # profesores únicos de las comisiones de esta cátedra
    comisiones: list[ComisionOpcion]  # tuplas (profesor, sede) de sus comisiones
    # Reseñas de la cátedra (para mostrar estrellas en el selector del planner).
    avg_rating: float | None = None
    review_count: int = 0


class MateriaOpciones(BaseModel):
    codigo: int
    nombre: str
    catedras: list[CatedraOpcion]


class HealthResponse(BaseModel):
    status: str
    db: str


class Carrera(BaseModel):
    slug: str
    nombre: str
    sedes: list[str] = []


class UserProfile(BaseModel):
    carrera: str | None = None
    nombre: str | None = None


class UpdateProfileRequest(BaseModel):
    carrera: str | None = None
    nombre: str | None = None

    @field_validator("nombre")
    @classmethod
    def _clean_nombre(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v[:100]

    @model_validator(mode="after")
    def _al_menos_uno(self) -> "UpdateProfileRequest":
        if self.carrera is None and self.nombre is None:
            raise ValueError("Se requiere carrera o nombre")
        return self


class SubscriptionState(BaseModel):
    active: bool
    valid_until: datetime | None


class Me(BaseModel):
    carrera: str | None = None
    nombre: str | None = None
    subscription: SubscriptionState


class ClientErrorReport(BaseModel):
    message: str
    kind: Literal["render", "onerror", "unhandledrejection", "api"]
    name: str | None = None
    stack: str | None = None
    component_stack: str | None = None
    url: str | None = None
    user_agent: str | None = None
    app_version: str | None = None

    # Truncamos los campos largos para no volcar payloads enormes en los logs.
    @field_validator("message", "stack", "component_stack")
    @classmethod
    def _truncate(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 2000:
            return v[:2000] + "…[truncado]"
        return v
