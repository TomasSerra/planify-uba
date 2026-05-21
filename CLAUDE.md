# Organización Horarios — Facultad de Psicología (UBA)

App para armar planes de cursada combinando materias, cátedras, profesores y restricciones (días, franjas, sedes). El backend genera todas las combinaciones válidas vía producto cartesiano + filtro de solapamientos. Modelo freemium: anónimo y free igual; usuario Pro (pago único 3 meses por Mercado Pago) desbloquea filtros, favoritos y cap de 100 planes.

## Tracking

- **Linear**: https://linear.app/planify-uba/team/PLA/all — tickets del proyecto.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind + shadcn/ui. Color primario `#861f5c`.
- **Backend**: FastAPI + Postgres 16 (psycopg pool).
- **Auth**: Firebase Authentication (email/password + Google). Modal propio sobre la app (sin redirect a página externa). Web SDK en el FE, `firebase-admin` valida ID tokens en el BE.
- **Pagos**: Mercado Pago Checkout Pro (one-shot 3 meses). Webhook firma con `MP_WEBHOOK_SECRET`.
- **Scraper**: Python (`requests` + `beautifulsoup4`) contra `academica.psi.uba.ar`. Idempotente.
- **Orquestación local**: Docker Compose (DB + API + Frontend + scraper).

## Hosting

| Servicio | Plataforma | Notas |
| --- | --- | --- |
| Frontend | **Vercel** | SPA. `vercel.json` reescribe a `/index.html`. Envs: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`. |
| API | **Render** | Docker (mismo `backend/Dockerfile`). Service account de Firebase como Secret File en `/etc/secrets/firebase-sa.json`; `GOOGLE_APPLICATION_CREDENTIALS` apunta ahí. |
| DB | **Neon** (Postgres) | `DATABASE_URL` (con `sslmode=require`) en envs del API. |
| Auth | **Firebase** | Email/Password + Google habilitados. Authorized domains: `localhost`, dominio de Vercel. |
| Scraper | **GitHub Actions** | Cron diario (06:00 UTC). Ver [.github/workflows/scrape.yml](.github/workflows/scrape.yml). Secret `DATABASE_URL` apunta a Neon. |

Local: Docker Compose levanta todo. El service account de Firebase vive en `backend/firebase-sa.json` (gitignored) y se monta read-only en el contenedor del API.

## Layout

```
backend/
  api/           FastAPI (main.py, planes.py, auth.py, subs.py, pagos.py, favoritos.py, models.py, db.py)
  scraper/       discovery + parse + insert
  schema.sql     DDL (materias, catedras, cursos, comision_obliga, subscriptions, favorite_plans)
  firebase-sa.json   (gitignored) service account de Firebase Admin
frontend/
  src/
    pages/       Home.tsx, Favoritos.tsx, PlanesEstudio.tsx
    components/
      AuthProvider.tsx, AuthDialog.tsx          modal login/signup
      PaywallProvider.tsx                       dialog de pago
      Header, MateriaSelector, MateriaCard, CalendarioPlan, RestriccionesPanel, PlanNavigator, ui/*
    lib/
      api.ts, types.ts, utils.ts, alert.tsx
      firebase.ts        initializeApp + getAuth + GoogleAuthProvider
      authContext.ts     tipos + Context
      useAuth.ts         hook que devuelve { user, isAuthenticated, isLoading, getAccessTokenSilently, logout, openLogin }
      useSubscription.ts query a /me/subscription
      paywall.ts         hook para abrir el PaywallDialog
docker-compose.yml
Makefile        // `make up` levanta todo y siembra DB si está vacía
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
- `subscriptions(clerk_user_id, valid_from, valid_until, mp_payment_id, mp_external_reference, ...)` — pagos de MP. `clerk_user_id` es nombre histórico: hoy almacena el `uid` de Firebase (string opaco). No hay tabla `users` propia.
- `favorite_plans(clerk_user_id, plan_data, filters_data, ...)` — planes guardados por usuarios Pro.

Una "opción" para una materia = (comisión + sus obligas). Un "plan" = una opción por cada materia seleccionada, sin solapamientos horarios.

## Auth flow (resumen)

- FE: `<AuthProvider>` envuelve la app. `useAuth()` expone el estado. `openLogin("signin" | "signup")` abre el `<AuthDialog>` global (modal sobre la página actual; sin nueva ruta).
- Modal soporta email/password y Google (`signInWithPopup`, fallback a redirect si popup bloqueado).
- Token: `getAccessTokenSilently()` resuelve a `auth.currentUser.getIdToken()`. Se manda como `Authorization: Bearer <idToken>` a la API.
- BE: dependency `current_user` valida con `firebase_admin.auth.verify_id_token`. `user.id` = `uid` de Firebase. `optional_user` para endpoints semi-públicos (como `/planes`).
- Persistencia: Firebase usa IndexedDB (compartido entre tabs sin parches manuales).

## Convenciones

- **Idioma**: UI y comentarios en castellano (rioplatense). Código en inglés salvo nombres del dominio (materia, cátedra, profesor, plan).
- **Comments**: solo cuando el WHY no es obvio. Nada de docstrings largos ni explicar QUÉ hace el código.
- **Sin features especulativas**: nada de error handling para casos imposibles, abstracciones para "futuros casos", flags de feature flag a menos que se pidan.
- **Edits**: preferir editar archivos existentes a crear nuevos. No crear `.md` salvo que el usuario lo pida.
- **Tests**: el repo no tiene suite de tests. Verificación se hace levantando el stack y probando en navegador.

## Archivos por dominio (más detalle en `backend/CLAUDE.md` y `frontend/CLAUDE.md`)

- Generador de planes: [backend/api/planes.py](backend/api/planes.py).
- Endpoints API: [backend/api/main.py](backend/api/main.py).
- Auth backend: [backend/api/auth.py](backend/api/auth.py).
- Modal de login/signup: [frontend/src/components/AuthDialog.tsx](frontend/src/components/AuthDialog.tsx).
- Pantalla principal: [frontend/src/pages/Home.tsx](frontend/src/pages/Home.tsx).
- Calendario: [frontend/src/components/CalendarioPlan.tsx](frontend/src/components/CalendarioPlan.tsx).
