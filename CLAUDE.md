# Organización Horarios — Facultad de Psicología (UBA)

App para armar planes de cursada combinando materias, cátedras, profesores y restricciones (días, franjas, sedes). El backend genera todas las combinaciones válidas vía producto cartesiano + filtro de solapamientos.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind + shadcn/ui. Color primario `#861f5c`.
- **Backend**: FastAPI + Postgres 16 (psycopg pool).
- **Scraper**: Python (`requests` + `beautifulsoup4`) contra `academica.psi.uba.ar`. Idempotente.
- **Orquestación**: Docker Compose (DB + API + Frontend + scraper).

## Layout

```
backend/
  api/           FastAPI (main.py, planes.py, models.py, db.py)
  scraper/       discovery + parse + insert
  schema.sql     DDL (materias, catedras, cursos, comision_obliga)
frontend/
  src/
    pages/       Home.tsx (única pantalla)
    components/  MateriaSelector, MateriaCard, CalendarioPlan, RestriccionesPanel, PlanNavigator, ui/*
    lib/         api.ts, types.ts, utils.ts
docker-compose.yml
Makefile        // `make up` levanta todo y siembra DB si está vacía
auth-paywall-plan.md   // plan para sumar Clerk + Mercado Pago + favoritos
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `make up` | Levanta DB + API + FE; siembra DB si está vacía. URLs en stdout. |
| `make down` | Apaga (preserva data). |
| `make reset` | Borra volumen y vuelve desde cero. |
| `make scrape` | Re-corre scraper (idempotente). |
| `make psql` | Abre psql contra la DB. |
| `make logs` | Sigue logs API + FE. |

URLs locales: FE `http://localhost:5173`, API `http://localhost:8000`, Swagger `/docs`.

## Modelo de datos

- `materias(codigo, nombre)` — código numérico de la materia.
- `catedras(id, materia_codigo, numero, titular, cuatrimestre)`.
- `cursos(id, catedra_id, tipo, codigo, dia, hora_inicio, hora_fin, profesor, aula, sede, ...)` con `tipo ∈ {teorico, seminario, comision}`.
- `comision_obliga(comision_id, obliga_a_id)` — many-to-many: una comisión puede obligar a 1 o 2 cursos (teórico/seminario) de la misma cátedra. El scraper resuelve esto con matching difuso (cobertura ~99.95%).

Una "opción" para una materia = (comisión + sus obligas). Un "plan" = una opción por cada materia seleccionada, sin solapamientos horarios.

## Convenciones

- **Idioma**: UI y comentarios en castellano (rioplatense). Código en inglés salvo nombres del dominio (materia, cátedra, profesor, plan).
- **Comments**: solo cuando el WHY no es obvio. Nada de docstrings largos ni explicar QUÉ hace el código.
- **Sin features especulativas**: nada de error handling para casos imposibles, abstracciones para "futuros casos", flags de feature flag a menos que se pidan.
- **Edits**: preferir editar archivos existentes a crear nuevos. No crear `.md` salvo que el usuario lo pida.
- **Tests**: el repo no tiene suite de tests. Verificación se hace levantando el stack y probando en navegador.

## Archivos por dominio (más detalle en `backend/CLAUDE.md` y `frontend/CLAUDE.md`)

- Generador de planes: [backend/api/planes.py](backend/api/planes.py).
- Endpoints API: [backend/api/main.py](backend/api/main.py).
- Pantalla principal: [frontend/src/pages/Home.tsx](frontend/src/pages/Home.tsx).
- Calendario: [frontend/src/components/CalendarioPlan.tsx](frontend/src/components/CalendarioPlan.tsx).

## Roadmap relevante

Auth + paywall + favoritos con Clerk + Mercado Pago: ver [auth-paywall-plan.md](auth-paywall-plan.md). Aún no implementado.
