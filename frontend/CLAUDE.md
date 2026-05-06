# Frontend — Vite + React + TypeScript

SPA de una sola página (`Home.tsx`) que consume la API de FastAPI. shadcn/ui sobre Tailwind con primario `#861f5c`.

## Estructura

```
frontend/src/
  main.tsx               entrypoint
  App.tsx                renderiza <Home />
  pages/Home.tsx         única pantalla: selector + filtros + calendario
  components/
    MateriaSelector.tsx  popover de búsqueda + lista de materias agregadas
    MateriaCard.tsx      card por materia con dropdowns Cátedra y Profesores
    RestriccionesPanel.tsx  días, franjas, sedes (será gateado por paywall)
    CalendarioPlan.tsx   grilla 7-23 hs × días, bloques absolute-positioned
    PlanNavigator.tsx    flechas + "Plan X de N"
    ui/                  shadcn primitives (button, popover, command, checkbox, ...)
  lib/
    api.ts               fetch wrapper, baseURL desde VITE_API_URL
    types.ts             tipos compartidos con el backend (mantener en sync)
    utils.ts             cn(), helpers
  index.css              tailwind + design tokens (CSS vars)
tailwind.config.ts
```

## Cómo corre

- `npm run dev` (vite, port 5173). En docker el volumen `./frontend:/app` da HMR.
- `VITE_API_URL=http://localhost:8000` (default si falta).

## Convenciones

- **Castellano** en UI y comentarios. Identificadores en inglés salvo dominio (materia, cátedra, profesor, plan, franja, sede).
- **Tailwind**: utilidades inline. Sin CSS modules. Para clases dinámicas usar `cn()` de `lib/utils.ts`.
- **Estado de página** vive en `Home.tsx`. Hijos comunican via callbacks `onChange`. Sin librería de state management — la app es chica.
- **Sentinel de profesores**: `string[] | null`. `null` = todos (no filtrar), `[]` = ninguno (cero opciones), lista = subset explícito. Mantener consistente con backend.
- **Calendario**: rango fijo `7:00 → 23:00`. `PIXELS_PER_HOUR = 32`. Las etiquetas de hora se renderizan absolute (16 etiquetas para 16 marcas, sobre 16 slots de hora). Bloques de cursos posicionados absolute con `top` y `height` calculados.
- **Botón "Generar"**: deshabilitado si no cambió ningún filtro desde la última generación. La firma se calcula con `JSON.stringify` de los inputs en `Home.tsx`.

## Componentes shadcn

Vienen ya generados en `components/ui/`. No regenerar con CLI: editar el archivo si hace falta. Si agregás uno nuevo, copiar el patrón existente (forwardRef + cva variants).

## Tipos

`lib/types.ts` espeja modelos de Pydantic del backend. Cuando cambia algo en el backend (response shape, nuevo campo), actualizar acá. No hay generación automática.

## Verificación visual

Para cambios observables en la UI: levantar el dev server (`make up` o `npm run dev`) y verificar en browser. Si el usuario te dijo que verifica él, no levantes preview.

Si igual necesitás verificar:
- `mcp__Claude_Preview__preview_start` con `name: "horarios-frontend"` (definido en `.claude/launch.json`).
- Si Docker está usando el puerto 5173, parar el container `horarios-frontend` antes (`docker stop horarios-frontend`) y restaurarlo cuando termines.
- El backend debe estar corriendo (Docker o local) para que las requests funcionen.
- CORS solo permite `localhost:5173` y `localhost:3000` (ver [backend/api/main.py:65-69](../backend/api/main.py)).

## Roadmap relevante

Auth + paywall + favoritos: agrega `@clerk/clerk-react`, `@tanstack/react-query`, `react-router-dom`, hooks `useSubscription`, `<PaywallOverlay>`, páginas `/favoritos` y `/pago-exitoso`. Detalle en [auth-paywall-plan.md](../auth-paywall-plan.md).
