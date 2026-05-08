"""Armador de planes de cursada.

Dada una selección de materias y restricciones del usuario, genera todas las
combinaciones válidas (sin solapamiento horario) — una opción por materia,
donde cada opción es comisión + sus cursos obligados (teóricos/seminarios).
"""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import time
from typing import Iterable, Iterator

from pydantic import BaseModel, Field

from .models import CursoSummary


DIAS_VALIDOS = {"lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"}


class FranjaExcluida(BaseModel):
    dias: list[str] = Field(..., min_length=1, description="Uno o más días: lunes/.../sabado")
    hora_inicio: time
    hora_fin: time


class MateriaSeleccionada(BaseModel):
    codigo: int
    catedra_id: int | None = Field(
        None, description="Si se setea, restringe a esta cátedra; si no, permite todas"
    )
    profesores: list[str] | None = Field(
        default=None,
        description=(
            "Profesores permitidos para las comisiones de esta materia. "
            "None / ausente = todos. Lista vacía = ninguno (esa materia no "
            "tendrá opciones). Solo aplica al curso comisión, no a "
            "teóricos/seminarios."
        ),
    )


class PlanRequest(BaseModel):
    materias: list[MateriaSeleccionada] = Field(..., min_length=1, max_length=10)
    dias_excluidos: list[str] = Field(
        default_factory=list,
        description="Días enteros en los que no se quiere cursar",
    )
    franjas_excluidas: list[FranjaExcluida] = Field(
        default_factory=list,
        description="Franjas horarias (días + rango) no disponibles",
    )
    sedes_permitidas: list[str] = Field(
        default_factory=list,
        description="Sedes permitidas (HY/IN/SI/AV/EC). Vacío = todas.",
    )
    max_planes: int = Field(20, ge=1, le=100)


class CursoEnPlan(CursoSummary):
    catedra_id: int
    profesor: str | None = None
    sede: str | None = None


class OpcionMateria(BaseModel):
    materia_codigo: int
    materia_nombre: str
    catedra_id: int
    catedra_numero: str | None = None
    catedra_titular: str | None = None
    cursos: list[CursoEnPlan]  # comisión + obligaciones


class Plan(BaseModel):
    opciones: list[OpcionMateria]


class PlanResponse(BaseModel):
    planes: list[Plan]
    total_generados: int
    materias_sin_opciones: list[int] = Field(
        default_factory=list,
        description="Códigos de materia donde ninguna opción cumple las restricciones",
    )


def _curso_cumple_restricciones(
    curso: CursoEnPlan,
    dias_excluidos: set[str],
    franjas: list[FranjaExcluida],
    sedes_permitidas: set[str],
) -> bool:
    if sedes_permitidas and curso.sede and curso.sede not in sedes_permitidas:
        return False
    if curso.dia and curso.dia in dias_excluidos:
        return False
    if curso.dia and curso.hora_inicio and curso.hora_fin:
        for f in franjas:
            if curso.dia in f.dias and curso.hora_inicio < f.hora_fin and f.hora_inicio < curso.hora_fin:
                return False
    return True


def _opcion_key(op: OpcionMateria) -> int:
    # La comisión siempre es el primer curso (ver _fetch_opciones_por_materia).
    return op.cursos[0].id


def _differs_in(p1: Plan, p2: Plan, idx: int) -> bool:
    return _opcion_key(p1.opciones[idx]) != _opcion_key(p2.opciones[idx])


def _differs_only_in(p1: Plan, p2: Plan, idx: int) -> bool:
    for i, (a, b) in enumerate(zip(p1.opciones, p2.opciones)):
        same = _opcion_key(a) == _opcion_key(b)
        if i == idx and same:
            return False
        if i != idx and not same:
            return False
    return True


def _reorder_round_robin(planes: list[Plan], num_materias: int) -> list[Plan]:
    """Reordena los planes para que la materia que cambia entre planes
    consecutivos rote (plan 1→2 cambia materia 0, 2→3 cambia materia 1, ...).
    Si no hay candidato que cambie sólo la materia objetivo, cae a uno que
    cambie esa materia (entre otras) y, en última instancia, a cualquiera."""
    if len(planes) <= 1 or num_materias <= 1:
        return planes
    pool = list(planes)
    ordered = [pool.pop(0)]
    while pool:
        target = (len(ordered) - 1) % num_materias
        prev = ordered[-1]
        idx = next(
            (i for i, p in enumerate(pool) if _differs_only_in(prev, p, target)),
            None,
        )
        if idx is None:
            idx = next(
                (i for i, p in enumerate(pool) if _differs_in(prev, p, target)),
                None,
            )
        if idx is None:
            idx = 0
        ordered.append(pool.pop(idx))
    return ordered


def _enumerar_combos_balanced(
    opciones_validas: list[list[OpcionMateria]],
) -> Iterator[tuple[OpcionMateria, ...]]:
    """BFS sobre el grafo de combinaciones desde el origen (primera opción de
    cada materia). Vecinos = combos que difieren en exactamente una posición.
    A diferencia de itertools.product (que varía la última materia primero y
    deja las primeras casi fijas), esto asegura que en los primeros combos
    aparezcan variaciones de TODAS las materias."""
    n = len(opciones_validas)
    if n == 0:
        return
    sizes = [len(o) for o in opciones_validas]
    origin = tuple([0] * n)
    visited: set[tuple[int, ...]] = {origin}
    queue: deque[tuple[int, ...]] = deque([origin])
    while queue:
        state = queue.popleft()
        yield tuple(opciones_validas[i][state[i]] for i in range(n))
        for i in range(n):
            for v in range(sizes[i]):
                if v == state[i]:
                    continue
                nxt = state[:i] + (v,) + state[i + 1 :]
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)


def _hay_solapamiento(cursos: Iterable[CursoEnPlan]) -> bool:
    by_day: dict[str, list[CursoEnPlan]] = defaultdict(list)
    for c in cursos:
        if c.dia and c.hora_inicio and c.hora_fin:
            by_day[c.dia].append(c)
    for day_cursos in by_day.values():
        day_cursos.sort(key=lambda c: c.hora_inicio)
        for a, b in zip(day_cursos, day_cursos[1:]):
            if a.hora_fin > b.hora_inicio:
                return True
    return False


def _fetch_opciones_por_materia(conn, materia_codigos: list[int]) -> dict[int, list[OpcionMateria]]:
    """Para cada materia, devuelve todas sus opciones de cursada
    (una por comisión, con sus obligaciones expandidas)."""
    rows = conn.execute(
        """
        SELECT m.codigo AS materia_codigo, m.nombre AS materia_nombre,
               ca.id AS catedra_id, ca.numero AS catedra_numero,
               ca.titular AS catedra_titular,
               com.id AS comision_id, com.codigo AS comision_codigo,
               com.dia, com.hora_inicio, com.hora_fin,
               com.profesor, com.aula, com.sede
          FROM materias m
          JOIN catedras ca ON ca.materia_codigo = m.codigo
          JOIN cursos com ON com.catedra_id = ca.id AND com.tipo = 'comision'
         WHERE m.codigo = ANY(%s)
         ORDER BY m.codigo, ca.id, LENGTH(com.codigo), com.codigo
        """,
        (materia_codigos,),
    ).fetchall()

    if not rows:
        return {cod: [] for cod in materia_codigos}

    comision_ids = [r["comision_id"] for r in rows]
    obliga_rows = conn.execute(
        """
        SELECT co.comision_id,
               t.id, t.tipo::text AS tipo, t.codigo, t.dia,
               t.hora_inicio, t.hora_fin, t.aula, t.profesor, t.sede,
               t.catedra_id
          FROM comision_obliga co
          JOIN cursos t ON t.id = co.obliga_a_id
         WHERE co.comision_id = ANY(%s)
         ORDER BY t.tipo, t.codigo
        """,
        (comision_ids,),
    ).fetchall()

    obliga_map: dict[int, list[CursoEnPlan]] = defaultdict(list)
    for r in obliga_rows:
        cid = r.pop("comision_id")
        obliga_map[cid].append(CursoEnPlan(**r))

    opciones_por_materia: dict[int, list[OpcionMateria]] = {cod: [] for cod in materia_codigos}
    for r in rows:
        comision = CursoEnPlan(
            id=r["comision_id"],
            tipo="comision",
            codigo=r["comision_codigo"],
            dia=r["dia"],
            hora_inicio=r["hora_inicio"],
            hora_fin=r["hora_fin"],
            aula=r["aula"],
            profesor=r["profesor"],
            sede=r["sede"],
            catedra_id=r["catedra_id"],
        )
        cursos = [comision, *obliga_map.get(r["comision_id"], [])]
        opciones_por_materia[r["materia_codigo"]].append(
            OpcionMateria(
                materia_codigo=r["materia_codigo"],
                materia_nombre=r["materia_nombre"],
                catedra_id=r["catedra_id"],
                catedra_numero=r["catedra_numero"],
                catedra_titular=r["catedra_titular"],
                cursos=cursos,
            )
        )
    return opciones_por_materia


def armar_planes(conn, req: PlanRequest) -> PlanResponse:
    dias_excluidos = {d.lower() for d in req.dias_excluidos}
    sedes_permitidas = set(req.sedes_permitidas)
    materia_codigos = [m.codigo for m in req.materias]
    selecciones_por_codigo: dict[int, MateriaSeleccionada] = {m.codigo: m for m in req.materias}

    opciones_por_materia = _fetch_opciones_por_materia(conn, materia_codigos)

    opciones_validas: list[list[OpcionMateria]] = []
    materias_sin_opciones: list[int] = []
    for cod in materia_codigos:
        seleccion = selecciones_por_codigo[cod]
        opciones = opciones_por_materia.get(cod, [])

        # Filtrar por cátedra elegida (si la hay).
        if seleccion.catedra_id is not None:
            opciones = [op for op in opciones if op.catedra_id == seleccion.catedra_id]

        # Filtrar por profesores permitidos. Semántica:
        #   None  -> sin filtro (todos los profesores permitidos)
        #   []    -> ninguno permitido -> 0 opciones
        #   [...]  -> solo comisiones cuyo profesor esté en la lista
        # Solo aplica al curso de tipo comisión: teóricos/seminarios vienen
        # "atados" a la comisión.
        if seleccion.profesores is None:
            pass
        elif not seleccion.profesores:
            opciones = []
        else:
            profesores_permitidos = set(seleccion.profesores)
            opciones = [
                op for op in opciones
                if any(
                    c.tipo == "comision" and c.profesor in profesores_permitidos
                    for c in op.cursos
                )
            ]

        validas = [
            op for op in opciones
            if all(
                _curso_cumple_restricciones(c, dias_excluidos, req.franjas_excluidas, sedes_permitidas)
                for c in op.cursos
            )
        ]
        if not validas:
            materias_sin_opciones.append(cod)
        else:
            opciones_validas.append(validas)

    if materias_sin_opciones:
        return PlanResponse(planes=[], total_generados=0, materias_sin_opciones=materias_sin_opciones)

    # Generamos un pool más grande que max_planes para que el reorden
    # round-robin tenga material para diversificar (si solo tomáramos los
    # primeros max_planes de itertools.product, todos diferirían en la última
    # materia y el reorden no podría rotar).
    POOL_MULTIPLIER = 10
    POOL_HARD_CAP = 1000
    pool_target = min(req.max_planes * POOL_MULTIPLIER, POOL_HARD_CAP)

    planes: list[Plan] = []
    total = 0
    for combo in _enumerar_combos_balanced(opciones_validas):
        total += 1
        cursos = [c for op in combo for c in op.cursos]
        if not _hay_solapamiento(cursos):
            planes.append(Plan(opciones=list(combo)))
            if len(planes) >= pool_target:
                break

    planes = _reorder_round_robin(planes, num_materias=len(opciones_validas))[
        : req.max_planes
    ]

    return PlanResponse(
        planes=planes,
        total_generados=total,
        materias_sin_opciones=[],
    )
