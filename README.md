# LIGHT — Revista de estilo

Web pública y Dashboard editorial de LIGHT. React + Vite en el cliente, Supabase como base de datos, autenticación y tiempo real, y un pequeño servidor Express/tRPC heredado de la plantilla.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
pnpm dev               # http://localhost:3000 (respeta PORT)
```

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build de producción y servidor |
| `pnpm check` | Comprobación de tipos |
| `pnpm test` | Tests |
| `pnpm format` | Formatea el código con Prettier |

## Estructura

- `client/src/pages/` — hojas públicas (Home, Moda, Belleza, Eventos, Living, Runway, Archivo, Masthead, Business…) y `AdminDashboard` (`/admin`).
- `client/src/components/` — gestores del Dashboard (Ediciones, Runway, Masthead, Equipo, Calendario, Campañas…) y componentes compartidos.
- `client/src/lib/` — acceso a Supabase y lógica de cada apartado.
- `supabase/schema.sql` — esquema completo para instalaciones nuevas; `supabase/migrations/` — cambios incrementales; `supabase/functions/editorial-users` — Edge Function para gestionar usuarios.

Las páginas se cargan bajo demanda (`React.lazy` en `client/src/App.tsx`), así que el público no descarga el código del Dashboard.

## Documentación

- `EDITORIAL-CMS.md` — roles, permisos y funcionamiento del Dashboard.
- `GUIA_EDICION_VISUAL.md` — guía de edición visual.
- `TODO.md` — historial de cambios realizados.
