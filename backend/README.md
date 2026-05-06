# Backend — Organización Horarios

Stack: PostgreSQL 16 + FastAPI + scraper en Python. Todo en Docker.

## Requisitos

- Docker Desktop (Docker + Docker Compose)
- `make`

## Comando único

```bash
cd backend
make up
```

Este comando:

1. Levanta PostgreSQL y la API en containers.
2. Aplica `schema.sql` la primera vez.
3. Si la DB está vacía, corre el scraper (~2 min).
4. Deja todo listo en:
   - **API**: http://localhost:8000
   - **Swagger**: http://localhost:8000/docs
   - **DB**: `postgresql://postgres:postgres@localhost:5432/horarios`

Las re-corridas son rápidas: detecta que ya hay datos y skipea el scrape.

## Otros comandos

```bash
make down      # apaga containers (preserva datos)
make reset     # borra datos y vuelve a levantar desde cero
make scrape    # re-corre el scraper (idempotente: delete-then-insert por cátedra)
make psql      # abre psql contra la DB
make logs      # sigue logs de la API
make help      # ver todos los targets
```

## Endpoints

| Método | Path | Descripción |
| --- | --- | --- |
| GET | `/health` | Healthcheck (incluye estado de la DB) |
| GET | `/materias?q=psico` | Lista de materias con cantidad de cátedras |
| GET | `/materias/{codigo}` | Materia + sus cátedras |
| GET | `/catedras/{id}` | Cátedra + sus cursos (con `obliga_a` resuelto en comisiones) |
| GET | `/cursos?materia_codigo=&catedra_id=&tipo=&dia=&sede=&profesor=&incluir_obliga=&limit=&offset=` | Búsqueda flexible. `incluir_obliga=true` popula `obliga_a` |

Ejemplos:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/materias | jq
curl http://localhost:8000/catedras/34 | jq
curl 'http://localhost:8000/cursos?dia=lunes&sede=IN&tipo=teorico' | jq
curl 'http://localhost:8000/cursos?profesor=Ibarra&incluir_obliga=true' | jq
```

### Restricciones de cursada (`obliga_a`)

Inscribirse a una **comisión** obliga automáticamente a cursar uno o dos cursos
adicionales (teóricos y/o seminarios) de la misma cátedra. La fuente lo expresa
en la columna `Oblig.` (ej. `"IV - H"` = teórico IV + seminario H), y la API
lo expone resuelto como un array `obliga_a`:

```json
{
  "tipo": "comision",
  "codigo": "1",
  "obligatorio": "IV - H",
  "obliga_a": [
    {"tipo": "teorico",   "codigo": "IV", "dia": "sabado", "hora_inicio": "09:15:00", ...},
    {"tipo": "seminario", "codigo": "H",  "dia": "sabado", "hora_inicio": "12:45:00", ...}
  ]
}
```

- `obliga_a = null` → el curso no es comisión (los teóricos/seminarios no obligan a nada).
- `obliga_a = []` → comisión sin obligación explícita (~199 casos en la fuente).
- `obliga_a = [...]` → comisión con 1 o 2 obligaciones resueltas.

Cobertura del resolver: 99.95% (2109/2110 comisiones con `obligatorio` no-NULL).
Hay 1 caso con dato erróneo en la fuente que no se puede resolver
automáticamente.

Esto es la base para el futuro endpoint de "armado de planes": dado un set de
materias elegidas, generar combinaciones válidas (sin solapamiento horario)
expandiendo cada comisión a su set completo de cursos obligados.

## Hot reload

La carpeta `api/` está montada como volumen en el container. Cambios en `api/*.py` reinician uvicorn automáticamente.

## Fuente de datos

- Índice maestro: <http://academica.psi.uba.ar/Psi/Ope154_.php>
- Detalle por cátedra: `http://academica.psi.uba.ar/Psi/Ver154_.php?catedra=N`
