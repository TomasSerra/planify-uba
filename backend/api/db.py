from __future__ import annotations

import os

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está configurada")

pool = ConnectionPool(
    DATABASE_URL,
    kwargs={"row_factory": dict_row},
    min_size=1,
    max_size=5,
    # Con max_size=5 (Neon Free), un burst chico encola requests. Timeout
    # explícito para que el cliente reciba 500 rápido en vez de colgar
    # 30s (default de psycopg-pool). Métricas en Render lo hacen visible.
    timeout=5.0,
    open=False,
)
