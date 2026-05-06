# Organización Horarios — Facultad de Psicología (UBA)

Plataforma para armar planes de cursada combinando materias, cátedras y restricciones del usuario.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind + shadcn/ui (color principal `#861f5c`)
- **Backend**: FastAPI + PostgreSQL 16
- **Scraper**: Python (`requests` + `beautifulsoup4`) contra `academica.psi.uba.ar`
- Todo orquestado con Docker Compose

## Estructura

```
organizacion-horarios/
├── docker-compose.yml      # orquestador (DB + API + Frontend + scraper)
├── Makefile                # comando único: `make up`
├── backend/
│   ├── api/                # FastAPI (rutas + planes.py = armador)
│   ├── scraper/            # Python: discover.py, parse.py, db.py, main.py
│   ├── schema.sql
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── pages/Home.tsx
    │   ├── components/     # MateriaSelector, RestriccionesPanel, CalendarioPlan, PlanNavigator + ui/
    │   └── lib/            # api.ts, types.ts, utils.ts
    ├── tailwind.config.ts
    └── Dockerfile
```

## Comando único

```bash
make up
```

1. Levanta PostgreSQL, FastAPI y Vite en containers.
2. Si la DB está vacía, corre el scraper (~2 min) y la siembra.
3. Deja todo accesible en:
   - **Frontend**: http://localhost:5173
   - **API**: http://localhost:8000
   - **Swagger**: http://localhost:8000/docs

Re-corridas son instantáneas (la DB persiste en un volumen).

## Otros targets

```bash
make down      # apaga (preserva datos)
make restart   # down + up
make reset     # borra datos y vuelve a empezar
make scrape    # re-corre el scraper
make psql      # psql contra la DB
make logs      # logs API + Frontend
make help      # ver todos
```

## Funcionalidad actual

1. Buscar y agregar materias desde una lista (`/materias`).
2. Configurar restricciones:
   - Días enteros excluidos (chips)
   - Franjas horarias bloqueadas (día + rango)
   - Sedes permitidas (HY/IN/SI/AV/EC, vacío = todas)
3. Generar planes (`POST /planes`): el BE arma todas las combinaciones de
   `(comisión + obligaciones)` válidas por materia, hace producto cartesiano
   y filtra superposiciones horarias.
4. Calendario semanal con paleta de colores por materia. Navegación entre
   planes con flechas.

## Detalles del modelado

### Restricciones de cursada

Una **comisión** obliga automáticamente a cursar 1 o 2 cursos adicionales
(teóricos y/o seminarios) de la misma cátedra, expresado en la columna
`Oblig.` de la fuente (ej. `"IV - H"` = teórico IV + seminario H).

El scraper resuelve esa cadena a una tabla relacional `comision_obliga`
(many-to-many) con matching difuso para typos comunes (`"Il" → II`,
`"l" → I`, `"Ï" → I`). Cobertura 99.95% sobre los datos reales.

### API

| Método | Path | Descripción |
| --- | --- | --- |
| GET | `/health` | Healthcheck |
| GET | `/materias?q=` | Lista de materias con filtro por nombre |
| GET | `/materias/{codigo}` | Materia + sus cátedras |
| GET | `/catedras/{id}` | Cátedra + cursos (con `obliga_a` resuelto) |
| GET | `/cursos?...&incluir_obliga=` | Búsqueda flexible |
| POST | `/planes` | Armado de planes (cuerpo: `materia_codigos`, `dias_excluidos`, `franjas_excluidas`, `sedes_permitidas`, `max_planes`) |

CORS habilitado para `localhost:5173` y `localhost:3000`.

## Fuente de datos

Sistema académico oficial: <http://academica.psi.uba.ar/Psi/Ope154_.php>

## Próximos pasos

- Persistir selecciones del usuario (URL params o localStorage).
- Mostrar info detallada al hacer click en un curso del calendario.
- Filtros adicionales: profesor preferido, máximo de horas/día.
- Deploy en Railway/Render.
