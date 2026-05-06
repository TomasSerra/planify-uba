# Auth + paywall + favoritos con Clerk + Mercado Pago

## Context

La app hoy es libre y stateless: cualquiera entra, agrega materias, genera planes. Vos querés sumar una capa premium pagada (3 meses por Mercado Pago) **sin obligar al login** para el uso básico. Decisiones cerradas en la conversación previa:

- **Auth**: Clerk (free hasta 10k MAU). Email/password + Google OAuth listos sin código de UI. Solo necesario para acceder a features pagas.
- **DB**: Neon Postgres (free tier). Mantenemos la misma base que ya conoce el backend.
- **Pagos**: Mercado Pago Checkout Pro, pago único de 3 meses con renovación manual.
- **Tres estados de usuario**:
  - **Anónimo** (sin login) y **logueado-sin-pago**: mismo nivel free.
    - No puede usar filtros (días, franjas, sedes, cátedra fija, filtro de profesores).
    - No puede guardar planes en favoritos.
    - El generador devuelve a lo sumo **10 planes**.
  - **Logueado-con-pago activo**: filtros completos, favoritos ilimitados, hasta 100 planes (cap actual del backend).
- **Login obligatorio solo para**: pagar y para usar/ver favoritos. El usuario anónimo que quiera pagar primero pasa por sign-up.

El objetivo del plan es definir cómo encajan estas piezas en el código actual sin romper la experiencia anónima que ya funciona.

## Arquitectura general

```
┌─────────────────┐         ┌──────────────────┐
│ React + Clerk   │◀───────▶│ Clerk (auth)     │
│ (Vercel)        │         └──────────────────┘
│                 │
│  - <ClerkProv>  │         ┌──────────────────┐
│  - JWT en fetch │────────▶│ FastAPI (Render) │──────┐
│  - Paywall UI   │         │ - verify Clerk   │      │
│  - MP redirect  │         │ - /planes (gate) │      │
└─────────────────┘         │ - /me/subs       │      ▼
        │                   │ - /me/favoritos  │  ┌────────────┐
        │ redirect          │ - /pagos/...     │  │ Neon (PG)  │
        ▼                   └──────────────────┘  │ + tablas   │
┌─────────────────┐                  ▲            │   nuevas   │
│ Mercado Pago    │── webhook ───────┘            └────────────┘
│ Checkout Pro    │
└─────────────────┘
```

Una sola Postgres (Neon) para todo: la data de horarios + las tablas nuevas (`subscriptions`, `favoritos`). Clerk es la fuente de verdad de identidad; nosotros guardamos `clerk_user_id` (string) como FK lógica en nuestras tablas, sin tabla `users` propia.

## Esquema nuevo

Archivo: [backend/schema.sql](backend/schema.sql) — agregar al final.

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
    id                     BIGSERIAL PRIMARY KEY,
    clerk_user_id          TEXT NOT NULL,
    valid_from             TIMESTAMPTZ NOT NULL,
    valid_until            TIMESTAMPTZ NOT NULL,
    mp_payment_id          TEXT,
    mp_external_reference  TEXT UNIQUE,    -- idempotency key
    amount_ars             NUMERIC(10, 2),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_user_until
    ON subscriptions(clerk_user_id, valid_until DESC);

CREATE TABLE IF NOT EXISTS favoritos (
    id             BIGSERIAL PRIMARY KEY,
    clerk_user_id  TEXT NOT NULL,
    nombre         TEXT NOT NULL,
    plan_snapshot  JSONB NOT NULL,     -- el Plan completo (opciones + cursos)
    inputs         JSONB NOT NULL,     -- materias + filtros usados, para re-generar
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_favoritos_user
    ON favoritos(clerk_user_id, created_at DESC);
```

`plan_snapshot` y `inputs` permiten dos cosas: ver el favorito tal como se guardó (snapshot estable aunque cambien los datos del scraper) y opcionalmente regenerar (inputs) si el usuario quiere actualizar.

## Backend

### Verificación de JWT de Clerk

Archivo nuevo: `backend/api/auth.py`

Clerk firma sus JWTs con RS256 y publica el JWKS en `https://<your>.clerk.accounts.dev/.well-known/jwks.json`. Implementación mínima:

- Dependency `current_user(authorization: str = Header(...)) -> ClerkUser` que:
  1. Parsea el `Bearer <jwt>`.
  2. Descarga (con cache de 1h) el JWKS.
  3. Verifica firma + `exp` + `iss` (= la URL de tu Clerk instance) usando `pyjwt`.
  4. Devuelve `ClerkUser(id=sub, email=…)`.
- Dependency derivada `optional_user` que devuelve `None` si no hay header (para endpoints públicos como `/materias`).
- Dependency derivada `current_paid_user` que requiere sub activa y tira 402 si no.

Dependencias nuevas en `requirements.txt`: `pyjwt[crypto]`, `httpx` (para JWKS y MP API).

### Helper de subscripción

Archivo nuevo: `backend/api/subs.py`

```python
def has_active_subscription(conn, clerk_user_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM subscriptions "
        "WHERE clerk_user_id = %s AND valid_until > NOW() "
        "LIMIT 1",
        (clerk_user_id,),
    ).fetchone()
    return row is not None

def get_subscription_state(conn, clerk_user_id: str) -> SubscriptionState:
    # Devuelve la sub vigente más lejana o un estado "no activa" con
    # info de la última que tuvo (para mostrar "vencida el X").
    ...
```

Endpoints:

- `GET /me/subscription` → `{ active: bool, valid_until: datetime|null, last_payment_id: str|null }`. Requiere `current_user`.

### Aplicar paywall en `/planes`

Archivo: [backend/api/planes.py](backend/api/planes.py)

El endpoint sigue siendo público (no requiere auth). Se gatea con un dependency opcional:

- `post_planes` pasa a `def post_planes(req: PlanRequest, user: ClerkUser | None = Depends(optional_user))`.
- Si `user is None` → tratar como free.
- Si hay user, calcular `is_paid = has_active_subscription(conn, user.id)`. Si no, también free.
- Si **no** está paga (anónimo o logueado-sin-sub), sobreescribir `req` para anular filtros y capear:

```python
if not is_paid:
    req = req.model_copy(update={
        "dias_excluidos": [],
        "franjas_excluidas": [],
        "sedes_permitidas": [],
        "max_planes": min(req.max_planes, 10),
        "materias": [
            m.model_copy(update={"catedra_id": None, "profesores": None})
            for m in req.materias
        ],
    })
```

Esto hace **enforcement en server**: aunque el FE mande filtros (o un usuario anónimo los mande con curl), el BE los ignora. La UI los esconde, pero la seguridad real está acá.

El response de `/planes` debería incluir además un flag `is_paid` para que el FE sepa si el cap de 10 que vio fue por paywall (mostrar banner CTA) o no.

### Favoritos

Archivo nuevo: `backend/api/favoritos.py`

Endpoints (todos requieren `current_paid_user`):

- `GET /me/favoritos` → lista de favoritos del usuario.
- `POST /me/favoritos` con body `{ nombre, plan_snapshot, inputs }` → crea.
- `DELETE /me/favoritos/{id}` → borra (verifica ownership).

Validación: `nombre` no vacío, length ≤ 80. `plan_snapshot` se persiste tal cual lo manda el FE (es lo que la UI ya tiene en memoria), no lo re-validamos por estructura — es un blob para mostrar.

### Pagos con Mercado Pago

Archivo nuevo: `backend/api/pagos.py`

Variables de entorno nuevas:

- `MP_ACCESS_TOKEN` (server-side de tu cuenta MP).
- `MP_WEBHOOK_SECRET` (clave que MP firma con HMAC SHA-256 las notificaciones).
- `APP_URL` (ej. `https://horarios.example.com`) para construir success/failure URLs.
- `SUBSCRIPTION_PRICE_ARS` (ej. `5000`) — fácil de tunear sin redeploy.
- `SUBSCRIPTION_DAYS` = `90`.

Flujo de pago:

1. **`POST /pagos/checkout`** (requiere `current_user`):
   - Genera un `external_reference` UUID.
   - Llama a la API de MP `POST /checkout/preferences` con:
     - `items: [{ title: "Acceso 3 meses", quantity: 1, unit_price: SUBSCRIPTION_PRICE_ARS, currency_id: "ARS" }]`
     - `external_reference`
     - `payer.email = user.email`
     - `back_urls.success = APP_URL + "/pago-exitoso"`
     - `notification_url = APP_URL_BACKEND + "/pagos/webhook"`
   - Guarda una fila *pending* en una tabla `payment_intents` (opcional, solo para auditoría) o directamente espera al webhook.
   - Devuelve `{ init_point: "https://www.mercadopago.com/..." }`.

2. **`POST /pagos/webhook`**:
   - Verifica la firma `x-signature` con `MP_WEBHOOK_SECRET` (HMAC del request id + timestamp + body).
   - Si `topic == "payment"` y `data.id` está presente, hace `GET https://api.mercadopago.com/v1/payments/{id}` con el access token.
   - Si el pago vino `status == "approved"`, inserta en `subscriptions`:
     - `clerk_user_id` = del `external_reference` (que el FE obtuvo previamente y mandó como user logueado, atado en el server al crear la preference).
     - `valid_from = NOW()` y `valid_until = NOW() + INTERVAL '90 days'` *o* extender desde `valid_until` actual si todavía hay una sub vigente.
     - `mp_payment_id`, `mp_external_reference`, `amount_ars`.
   - **Idempotencia**: `mp_external_reference` UNIQUE → si llega el webhook dos veces, el segundo INSERT falla con violation y devolvemos 200 igual.

3. **`GET /pagos/{external_reference}/status`** (opcional, para que `/pago-exitoso` polee mientras el webhook tarda en llegar): devuelve `pending | approved | failed`.

Nota: Mercado Pago tarda hasta unos segundos en mandar el webhook. La página `/pago-exitoso` debe polear `/me/subscription` o `/pagos/{ref}/status` cada 2s durante ~30s.

### CORS y main.py

Archivo: [backend/api/main.py](backend/api/main.py)

- Sumar `APP_URL` (frontend prod) al `allow_origins`.
- Montar los routers nuevos:
  ```python
  from .auth import router as auth_router  # si exponemos algo, p.ej. /me
  from .pagos import router as pagos_router
  from .favoritos import router as favoritos_router
  app.include_router(pagos_router, prefix="/pagos")
  app.include_router(favoritos_router, prefix="/me/favoritos")
  ```

## Frontend

### Setup base

Paquetes nuevos en [frontend/package.json](frontend/package.json):

- `@clerk/clerk-react` (auth UI + hooks).
- `@tanstack/react-query` (manejo de subscription state, favoritos).
- `react-router-dom` (rutas para `/favoritos`, `/pago-exitoso`, etc.).

Variables de entorno nuevas:

- `VITE_CLERK_PUBLISHABLE_KEY`.
- `VITE_API_URL` (ya existe).

### main.tsx

Archivo: [frontend/src/main.tsx](frontend/src/main.tsx)

Envolver `<App />` en `<ClerkProvider>` + `<QueryClientProvider>` + `<BrowserRouter>`.

### Cliente API con auth

Archivo: [frontend/src/lib/api.ts](frontend/src/lib/api.ts)

Hoy `request()` no manda `Authorization`. Cambio:

- Convertir `api` en un hook `useApi()` que usa `useAuth()` de Clerk para obtener `getToken()` y lo pega como `Bearer` en cada request.
- O alternativamente, exportar una función `request(token, ...)` y obtenerlo en el caller.

Recomiendo el hook: menos prop drilling y la mayoría de las llamadas hoy se hacen desde componentes con `useEffect`.

### Gate de UI

Hook nuevo: `useSubscription()` que hace `useQuery(['subscription'], () => api.getSubscription())`. Si `useUser()` de Clerk reporta usuario null, devuelve `{ isPaid: false, validUntil: null, isLoading: false }` sin pegarle al backend. Si hay user, hace la query.

Cambios:

- **[Home.tsx](frontend/src/pages/Home.tsx)**:
  - **Anónimo**: la app funciona como hoy (anónimo = free). El card "Filtros" se renderiza con `<PaywallOverlay>` encima con CTA "Iniciá sesión y pagá para usar filtros". El botón "Guardar favorito" no aparece.
  - **Logueado-sin-pago**: igual al anónimo en cuanto a gating (filtros bloqueados, favoritos ocultos), pero el CTA dice "Pagá para usar filtros" y abre el flujo de checkout directamente sin pasar por sign-up.
  - **Logueado-con-pago**: filtros habilitados, botón "Guardar favorito" visible, sin overlays.
  - El cap de `max_planes` lo aplica el backend; el FE muestra un banner "Estás viendo 10 planes — desbloqueá hasta 100" cuando `is_paid === false` en la respuesta.

- **Componente nuevo `PaywallOverlay`**: wrapper visual con prop para customizar el CTA según estado (anónimo vs logueado-sin-pago).

- **Header / UserMenu** ([frontend/src/pages/Home.tsx](frontend/src/pages/Home.tsx)):
  - Anónimo: botones `<SignInButton>` + un CTA "Pagar" que abre sign-up y al volver dispara el checkout.
  - Logueado: `<UserButton>` de Clerk + un chip "Sub vence el X" si está paga, o "Pagá para acceder a todo" con CTA si no.

### Páginas nuevas

- **`/favoritos`** ([frontend/src/pages/Favoritos.tsx](frontend/src/pages/Favoritos.tsx)): lista los favoritos del usuario (requiere paid). Cada uno se puede abrir → navega a `/?favorito=<id>` y Home carga el snapshot.
- **`/pago-exitoso`** ([frontend/src/pages/PagoExitoso.tsx](frontend/src/pages/PagoExitoso.tsx)): polea `/me/subscription` por 30s. Cuando aparece activa, redirige a Home.
- **`/pago-error`**: mensaje + botón reintentar.
- **`/sign-in`, `/sign-up`**: usar componentes hosted de Clerk.

### Botón "Pagar"

Click → `POST /pagos/checkout` → recibe `init_point` → `window.location.href = init_point`. MP redirige a `/pago-exitoso?...` cuando el usuario termina.

## Hosting (recordatorio de la conversación previa)

- **Frontend**: Vercel free.
- **Backend**: Render free (con limitación de cold start 30-50s tras 15min idle) o Vercel Python Functions (mejor cold start, requiere refactor del backend a handlers).
- **DB**: Neon free.
- **Auth**: Clerk free.
- **MP**: cuenta de Mercado Pago Argentina con credenciales productivas.

## Archivos críticos a modificar / crear

### Backend
- [backend/schema.sql](backend/schema.sql) — agregar tablas `subscriptions`, `favoritos`.
- [backend/requirements.txt](backend/requirements.txt) — `pyjwt[crypto]`, `httpx` (si no está), `mercadopago` (opcional, podemos usar httpx directo a la API).
- `backend/api/auth.py` (nuevo) — verificación JWT Clerk, dependencies.
- `backend/api/subs.py` (nuevo) — `has_active_subscription`, endpoint `/me/subscription`.
- `backend/api/favoritos.py` (nuevo) — CRUD de favoritos.
- `backend/api/pagos.py` (nuevo) — checkout + webhook MP.
- [backend/api/planes.py](backend/api/planes.py) — gate `is_paid` antes de `armar_planes`.
- [backend/api/main.py](backend/api/main.py) — montar routers, `APP_URL` en CORS.

### Frontend
- [frontend/package.json](frontend/package.json) — `@clerk/clerk-react`, `@tanstack/react-query`, `react-router-dom`.
- [frontend/src/main.tsx](frontend/src/main.tsx) — providers.
- [frontend/src/lib/api.ts](frontend/src/lib/api.ts) — auth header en cada request.
- `frontend/src/lib/useSubscription.ts` (nuevo).
- [frontend/src/pages/Home.tsx](frontend/src/pages/Home.tsx) — gating + UserButton + sub status.
- `frontend/src/pages/Favoritos.tsx` (nuevo).
- `frontend/src/pages/PagoExitoso.tsx` (nuevo).
- `frontend/src/components/PaywallOverlay.tsx` (nuevo).
- `frontend/src/components/RestriccionesPanel.tsx` — disabled si `!isPaid`.

## Verificación end-to-end

1. **Anónimo**:
   - Sin loguearse, generar planes: debe funcionar y devolver hasta 10 planes.
   - Mandar filtros explícitos por curl sin Authorization: el BE los ignora y devuelve 10 planes igual. Response trae `is_paid: false`.
   - Intentar `POST /me/favoritos` sin token: 401.
2. **Auth flujo**:
   - Levantar local con `VITE_CLERK_PUBLISHABLE_KEY` de development.
   - Registrar con email/password y con Google. Verificar que el JWT llega al BE y `/me/subscription` devuelve `active: false`.
3. **Paywall logueado sin pago**:
   - Generar planes con filtros activos: el BE los ignora y devuelve hasta 10 planes (verificar con curl mandando filtros explícitos + token).
   - Intentar `POST /me/favoritos`: debe dar 402.
4. **Pago (sandbox MP)**:
   - Configurar credenciales sandbox de Mercado Pago.
   - Click "Pagar" → redirige a checkout → pagar con tarjeta de prueba aprobada.
   - Webhook llega, `subscriptions` se inserta. `/pago-exitoso` muestra "Listo" y redirige.
5. **Con sub activa**:
   - Filtros se desbloquean.
   - Generar plan, guardarlo como favorito, verlo en `/favoritos`, borrarlo.
6. **Idempotencia webhook**: simular envío doble del mismo `external_reference` → la segunda fila no entra y la API responde 200.
7. **Expiración**: setear manualmente `valid_until` a ayer en la DB → BE pasa a tratar al user como free (igual que anónimo).
8. **Renovación**: pagar de nuevo cuando hay una sub activa que vence pronto → `valid_until` debería extenderse desde la actual, no desde `NOW()`.
