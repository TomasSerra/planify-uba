from __future__ import annotations

from contextlib import contextmanager
from typing import Iterable

import psycopg

from .config import DATABASE_URL
from .parse import CatedraDetalle


@contextmanager
def get_conn():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL no está configurada (revisar .env)")
    with psycopg.connect(DATABASE_URL) as conn:
        yield conn


def upsert_materia(conn: psycopg.Connection, codigo: int, nombre: str) -> None:
    conn.execute(
        """
        INSERT INTO materias (codigo, nombre)
        VALUES (%s, %s)
        ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
        """,
        (codigo, nombre),
    )


def upsert_catedra(
    conn: psycopg.Connection,
    catedra_id: int,
    materia_codigo: int,
    numero: str | None,
    titular: str | None,
    cuatrimestre: str | None,
) -> None:
    conn.execute(
        """
        INSERT INTO catedras (id, materia_codigo, numero, titular, cuatrimestre)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            materia_codigo = EXCLUDED.materia_codigo,
            numero         = EXCLUDED.numero,
            titular        = EXCLUDED.titular,
            cuatrimestre   = EXCLUDED.cuatrimestre
        """,
        (catedra_id, materia_codigo, numero, titular, cuatrimestre),
    )


def replace_cursos(conn: psycopg.Connection, detalle: CatedraDetalle) -> None:
    """Reemplaza los cursos de la cátedra: borra todo y re-inserta.

    Más simple y robusto que upsert por (catedra, tipo, codigo) cuando una
    comisión deja de existir entre cuatrimestres.
    """
    conn.execute("DELETE FROM cursos WHERE catedra_id = %s", (detalle.catedra_id,))
    if not detalle.cursos:
        return
    rows = [
        (
            detalle.catedra_id,
            c.tipo,
            c.codigo,
            c.dia,
            c.hora_inicio,
            c.hora_fin,
            c.profesor,
            c.vacantes,
            c.obligatorio,
            c.aula,
            c.sede,
            c.observaciones,
        )
        for c in detalle.cursos
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO cursos (
                catedra_id, tipo, codigo, dia, hora_inicio, hora_fin,
                profesor, vacantes, obligatorio, aula, sede, observaciones
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            rows,
        )


def resolve_obligatorio(conn: psycopg.Connection, catedra_id: int) -> None:
    """Resuelve `cursos.obligatorio` de las comisiones de la cátedra a filas en
    `comision_obliga`. Aplica matching difuso: 'l' (ele minúscula) → 'I',
    'Ï' → 'I', UPPER y TRIM. Esto resuelve typos comunes de la fuente
    ('Il', 'll', 'l', 'Ï') sin romper códigos legítimos.

    Idempotente: las filas previas se borran vía CASCADE cuando replace_cursos
    elimina los cursos.
    """
    conn.execute(
        r"""
        INSERT INTO comision_obliga (comision_id, obliga_a_id)
        SELECT DISTINCT cu.id, t.id
          FROM cursos cu
          JOIN cursos t ON t.catedra_id = cu.catedra_id
                         AND t.id <> cu.id
                         AND t.tipo IN ('teorico', 'seminario')
                         AND UPPER(REPLACE(REPLACE(t.codigo, 'l', 'I'), 'Ï', 'I')) = ANY(
                               SELECT UPPER(REPLACE(REPLACE(TRIM(token), 'l', 'I'), 'Ï', 'I'))
                                 FROM regexp_split_to_table(cu.obligatorio, '\s*-\s*') AS token
                                WHERE TRIM(token) <> ''
                             )
         WHERE cu.catedra_id = %s
           AND cu.tipo = 'comision'
           AND cu.obligatorio IS NOT NULL
        ON CONFLICT DO NOTHING
        """,
        (catedra_id,),
    )


def save_detalle(conn: psycopg.Connection, detalle: CatedraDetalle) -> None:
    upsert_materia(conn, detalle.materia_codigo, detalle.materia_nombre)
    upsert_catedra(
        conn,
        detalle.catedra_id,
        detalle.materia_codigo,
        detalle.numero,
        detalle.titular,
        detalle.cuatrimestre,
    )
    replace_cursos(conn, detalle)
    resolve_obligatorio(conn, detalle.catedra_id)
