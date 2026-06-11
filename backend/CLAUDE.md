# Backend — FastAPI + Postgres

API que sirve materias/cátedras/cursos y arma planes de cursada. Scraper aparte que siembra la DB. Auth con Firebase, pagos con Mercado Pago.

## Estructura

```
backend/
  api/
    main.py       endpoints + lifespan + CORS
    auth.py       dependency current_user / optional_user (firebase-admin)
    subs.py       /me/subscription + helper has_active_subscription
    pagos.py      /pagos/checkout + webhook de Mercado Pago
    favoritos.py  CRUD de favoritos (Pro)
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
  firebase-sa.json  (gitignored) service account de Firebase Admin para dev local
```

## Cómo corre

- `uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/api`. El volumen `./backend/api:/app/api` permite hot reload sin rebuild.
- Conexión via `DATABASE_URL` (psycopg pool, abierto en el lifespan).
- Auth: `firebase_admin.initialize_app()` lee `GOOGLE_APPLICATION_CREDENTIALS` (path al service-account JSON). En Docker está montado en `/run/secrets/firebase-sa.json`. En Render se sube como Secret File.

## Tests

- `make install-test-deps` crea un venv en `backend/.venv` e instala pytest + deps (una vez).
- `make test` corre la suite en `backend/tests/`. Tests puros: sin Docker, sin DB real, sin red. Tarda <1s.
- `make install-hooks` cablea el hook pre-commit que corre los tests antes de cada commit. Bloquea el commit si alguno falla y lista cuáles fueron.
- Cobertura actual: algoritmo de planes (todos los filtros + combinaciones), paywall Pro (`/planes` y `_request_uses_filters`), auth (Firebase mockeado), firma HMAC del webhook de MP, suscripciones (`has_active_subscription`, `_record_payment`, renovaciones, idempotencia), favoritos (gating Pro y aislamiento entre usuarios).
- DB mockeada con `FakeConn` en `backend/tests/conftest.py` (helpers `make_comision_row`, `make_obliga_row`, `setup_planes_db`). Firebase mockeado parcheando `_apps` antes del import + `monkeypatch` de `fb_auth.verify_id_token`.

## Hosting

API en **Render** (Docker, mismo `Dockerfile`). DB en **Neon** Postgres (`DATABASE_URL` con `sslmode=require`). Secrets del API en Render: `DATABASE_URL`, `GOOGLE_APPLICATION_CREDENTIALS`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_URL`, `APP_URL_BACKEND`.

## Endpoints

| Método | Path | Auth | Notas |
| --- | --- | --- | --- |
| GET | `/health` | — | Healthcheck DB. |
| GET | `/materias?q=` | — | Lista de materias con filtro substring. |
| GET | `/materias/{codigo}` | — | Materia + cátedras. |
| GET | `/materias/{codigo}/opciones` | — | Materia + cátedras + profesores únicos. Lo consume `MateriaCard.tsx`. |
| GET | `/catedras/{id}` | — | Cátedra + todos sus cursos con `obliga_a` resuelto. |
| GET | `/cursos?...&incluir_obliga=` | — | Búsqueda flexible. |
| POST | `/planes` | `optional_user` | Si el usuario es Pro, aplica filtros completos y cap 100. Si no, anula filtros y capea a 15. |
| GET | `/me/subscription` | `current_user` | Estado de suscripción del usuario. |
| POST | `/pagos/checkout` | `current_user` | Crea preferencia de MP, devuelve `init_point`. |
| GET | `/pagos/{external_reference}/status` | — | Polling público de status (idempotente). |
| POST | `/pagos/webhook` | — | Webhook de MP (valida firma `MP_WEBHOOK_SECRET`). |
| GET/POST/DELETE | `/favoritos` | `current_user` | CRUD; gateado a Pro adentro. |

CORS: `localhost:5173` y `localhost:3000`. Sumar nuevos orígenes (Vercel) en [api/main.py:65-69](api/main.py).

## Auth (firebase-admin)

[api/auth.py](api/auth.py):

- `firebase_admin.initialize_app()` se llama una vez al import. Usa Application Default Credentials → `GOOGLE_APPLICATION_CREDENTIALS`.
- `current_user(authorization: str = Header(...)) -> AuthUser`: parsea `Bearer <idToken>`, llama `fb_auth.verify_id_token(token)`, devuelve `AuthUser(id=decoded["uid"])`. Tira 401 ante token inválido / expirado.
- `optional_user`: devuelve `None` si no hay header, sino delega a `current_user`.
- `AuthUser.id` es el `uid` de Firebase como string opaco. Se almacena en columnas llamadas `clerk_user_id` (nombre histórico).

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
- La columna `clerk_user_id` en `subscriptions` y `favorite_plans` se llama así por historia (se planeó usar Clerk). Hoy almacena el `uid` de Firebase. No renombrar — el cambio requeriría una migración y no aporta nada funcional.
- Hot reload solo recoge cambios en `/app/api`. Cambios al scraper requieren re-build del container.
- **Tests obligatorios**: toda función nueva del backend que (a) implemente lógica de negocio (no glue puro ni queries triviales), (b) afecte el paywall / suscripciones / pagos, o (c) agregue un filtro nuevo al generador de planes, **debe** venir con tests en `backend/tests/`. El hook pre-commit los corre antes de cada commit — si rompés algo o no testeás algo nuevo crítico, el commit no entra. En particular:
  - **Nuevo filtro en `PlanRequest` / `MateriaSeleccionada`** → tests del filtro solo + tests de combinación con al menos otros 2 filtros existentes en `tests/test_planes_armar.py`. Si el filtro es feature Pro, también extender `_request_uses_filters` y agregar el campo a `tests/test_paywall.py`.
  - **Cambio en `has_active_subscription` o `_record_payment`** → tests de las nuevas ramas en `tests/test_subs.py`.
  - **Nuevo endpoint gateado por Pro** → tests de los 3 estados (anónimo, free, Pro) en el archivo de tests que corresponda.
  - **Cambio en la firma HMAC del webhook MP** → extender `tests/test_pagos_signature.py`.

## Cambios típicos

- **Nuevo endpoint**: agregar handler en `api/main.py` o crear router en archivo aparte y `app.include_router(...)`.
- **Nuevo filtro en `/planes`**: extender `PlanRequest`, aplicarlo en `armar_planes` antes del producto.
- **Schema change**: editar `schema.sql`. Para datos locales hay que `make reset` (no hay migraciones — la app es lo bastante chica para no necesitar Alembic todavía).
