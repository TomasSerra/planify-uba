# Backend — FastAPI + Postgres

API que sirve materias/cátedras/cursos y arma planes de cursada. Scraper aparte que siembra la DB.

## Estructura

```
backend/
  api/
    main.py       endpoints + lifespan + CORS
    planes.py     algoritmo de armado (producto cartesiano + filtros + overlap check)
    models.py     pydantic models compartidos
    db.py         psycopg connection pool
  scraper/
    main.py       entrypoint
    discover.py   listado de materias/cátedras
    parse.py      parsing HTML del sistema académico
    db.py         inserts idempotentes
    http.py       cliente con retries/delay
    config.py
  schema.sql      DDL ejecutado al crear la DB
  Dockerfile      uvicorn --reload --reload-dir /app/api
  requirements.txt
```

## Cómo corre

- `uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/api`. El volumen `./backend/api:/app/api` permite hot reload sin rebuild.
- Conexión via `DATABASE_URL` (psycopg pool, abierto en el lifespan).

## Endpoints (estado actual)

| Método | Path | Notas |
| --- | --- | --- |
| GET | `/health` | Healthcheck DB. |
| GET | `/materias?q=` | Lista de materias con filtro substring. |
| GET | `/materias/{codigo}` | Materia + cátedras. |
| GET | `/materias/{codigo}/opciones` | Materia + cátedras + profesores únicos por cátedra. Lo consume `MateriaCard.tsx`. |
| GET | `/catedras/{id}` | Cátedra + todos sus cursos con `obliga_a` resuelto. |
| GET | `/cursos?...&incluir_obliga=` | Búsqueda flexible. |
| POST | `/planes` | Body `PlanRequest` (`materias[]`, `dias_excluidos`, `franjas_excluidas`, `sedes_permitidas`, `max_planes`). Devuelve `PlanResponse`. |

CORS: `localhost:5173` y `localhost:3000`. Sumar nuevos orígenes (prod) en [api/main.py:65-69](api/main.py).

## Generador de planes ([api/planes.py](api/planes.py))

1. Por materia, traer todas las opciones (`comision + obligas`).
2. Filtrar por `catedra_id` si vino, por profesores permitidos (semántica: `None` = todos, `[]` = ninguno → 0 opciones, lista = subset), y por restricciones de día/franja/sede.
3. Si alguna materia queda sin opciones válidas → response con `materias_sin_opciones`.
4. `itertools.product(*opciones_validas)` y para cada combo chequear solapamientos. Cortar al alcanzar `max_planes`.

Notas:
- `total_generados` = combos evaluados hasta el corte (no = combos totales del producto).
- `_hay_solapamiento` opera sobre la lista plana de cursos del combo.
- El campo `profesores` en `MateriaSeleccionada` es `list[str] | None` con la semántica triple descrita.

## Reglas de modificación

- Tipos de respuesta usan Pydantic v2. Si agregás campos, actualizar también `frontend/src/lib/types.ts`.
- Las queries usan psycopg `dict_row` (filas son dicts). Mantener ese estilo.
- Idempotencia en scraper: cualquier fix debe seguir siendo seguro de re-correr (`make scrape`).
- No agregar `users` u otra tabla de identidad a mano: el plan es usar Clerk con `clerk_user_id` como FK lógica (ver [auth-paywall-plan.md](../auth-paywall-plan.md)).
- Hot reload solo recoge cambios en `/app/api`. Cambios al scraper requieren re-build del container.

## Cambios típicos

- **Nuevo endpoint**: agregar handler en `api/main.py` o crear router en archivo aparte y `app.include_router(...)`.
- **Nuevo filtro en `/planes`**: extender `PlanRequest`, aplicarlo en `armar_planes` antes del producto.
- **Schema change**: editar `schema.sql`. Para datos locales hay que `make reset` (no hay migraciones — la app es lo bastante chica para no necesitar Alembic todavía).
