from __future__ import annotations

from datetime import datetime, time

from pydantic import BaseModel


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


class UpdateProfileRequest(BaseModel):
    carrera: str


class SubscriptionState(BaseModel):
    active: bool
    valid_until: datetime | None


class Me(BaseModel):
    carrera: str | None = None
    subscription: SubscriptionState
