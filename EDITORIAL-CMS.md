# LIGHT Studio — CMS editorial

El Dashboard privado (`/admin`) funciona con Supabase Auth y las tablas editoriales. Supabase es la **única fuente de verdad**: todo lo que se guarda desde el Dashboard (artículos, Ediciones, Runway, Masthead, Destacado, ubicaciones de portada, Próximamente, Calendario, Campañas) lo ve al instante el resto del equipo y el público, sin recargar (Realtime).

## Puesta en marcha (una sola vez)

1. **Base de datos.**
   - Base nueva y vacía: ejecuta `supabase/schema.sql` una sola vez en el SQL Editor (ya incluye todas las migraciones).
   - Base ya inicializada: **no vuelvas a ejecutar `schema.sql`**. Ejecuta, en este orden y solo las que falten:
     1. `supabase/migrations/20261109_editorial_likes_deletions.sql`
     2. `supabase/migrations/20261110_team_permissions_sync.sql` ← nueva: equipo, permisos por rol, sincronización, borrado de comentarios, estadísticas de visitas.
2. **Función para crear usuarios desde el Dashboard.** Con la [CLI de Supabase](https://supabase.com/docs/guides/cli):
   ```bash
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase functions deploy editorial-users
   ```
   La función usa la clave de servicio que Supabase le inyecta; esa clave nunca llega al navegador.
3. **Variables en Vercel** (públicas del frontend): `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. **Seguridad de Auth.** En Supabase → Authentication → Providers → Email, desactiva **Allow new users to sign up**. Así solo existen las cuentas que crea un Owner.

## Acceso al Dashboard

Escribe en el buscador del sitio la **palabra de acceso** de tu cuenta (por ejemplo `snow`) y pulsa Enter; se abre el formulario de contraseña. La palabra de acceso de cada persona se define en **Dashboard → Equipo**. La migración 20261110 asigna automáticamente `snow`, `songbird`, `moonglow` y `bianca` a las cuentas cuyo correo empieza así.

El buscador es solo una puerta discreta, no la seguridad: la autoridad real son Supabase Auth y las políticas RLS.

> Las contraseñas no se documentan en el repositorio. Si alguna vez se usó una contraseña de demostración en cuentas reales, cámbiala desde **Equipo → 🔑**.

### Modo demostración

Sin variables de Supabase, el Dashboard solo funciona en desarrollo (`pnpm dev:static`) y guarda todo en el navegador. Una build de producción sin Supabase deja el acceso cerrado. Para forzar la demo en una preview, define `VITE_ENABLE_DEMO=true`.

## Equipo, roles y permisos (Dashboard → Equipo)

Visible para Owner (y para quien tenga el permiso *Equipo*).

- **Nuevo usuario:** nombre editorial (byline), correo, contraseña inicial (mín. 10 caracteres), palabra de acceso y rol. Requiere la función `editorial-users` desplegada.
- **Cambiar rol, nombre o palabra de acceso:** edita la fila y pulsa *Guardar*. Solo un Owner puede crear o modificar a otro Owner, y siempre debe quedar al menos un Owner activo.
- **Bloquear / Desbloquear:** una cuenta bloqueada pierde el acceso al Dashboard y todos sus permisos en la base de datos al instante. Sus artículos se conservan.
- **🔑 Contraseña:** fija una contraseña nueva para esa persona.
- **Permisos por rol:** para Admin y Staff Writer decide qué apartados del Dashboard pueden **Ver** y cuáles pueden **Editar**. Owner siempre lo tiene todo. Un apartado con *Ver* pero sin *Editar* se muestra en **modo lectura**. Estos permisos se aplican también en la base de datos (RLS), no solo en la pantalla.

Valores iniciales: Admin ve y edita todo salvo Equipo; Staff Writer ve en modo lectura Ediciones, Runway, Masthead, Destacado, Próximamente, Calendario, Campañas, Suscriptores, Comentarios y Solicitudes. *Suscriptores* y *Comentarios* contienen datos personales: quítales el permiso de ver si no lo necesitan.

### Artículos (reglas fijas)

- Staff Writer crea y edita **sus** borradores; no publica ni ve borradores ajenos. Puede **solicitar el borrado** de sus borradores con un motivo.
- Owner y Admin ven todos los borradores, publican, ocultan, destacan y borran (también los publicados). Las solicitudes se resuelven en **Solicitudes** con un comentario obligatorio; el historial se conserva.
- La autoría original (ID y byline) se conserva aunque otra persona edite o publique.
- La URL (`/historias/:slug`) se genera con el título mientras es borrador y **queda fija al publicarse**: cambiar el título después no rompe los enlaces compartidos. Si la URL ya existe, se añade un sufijo.
- La fecha de publicación original se conserva al volver a editar (`published_at`).

## Apartados compartidos

| Apartado | Dónde se guarda |
|---|---|
| Ediciones | `site_settings` → `public:magazine-editions` |
| Destacado del homepage | `site_settings` → `public:homepage-feature` |
| Ubicaciones (Hero, Selección, Must-Reads, Spotlight) | `site_settings` → `public:archive-placements` |
| Masthead y hojas de cada persona | `site_settings` → `public:masthead-team` |
| Runway | tabla `runway_brands` (el primer guardado copia también las firmas predeterminadas) |
| Próximamente | tabla `page_availability` |
| Calendario / Campañas | tablas `calendar_events` / `campaigns` |

### Próximamente

Al cerrar una sección, **todo el público** ve la portada de Próximamente. Las personas con sesión editorial pueden seguir abriéndola para trabajar y ven un aviso negro arriba que indica que está cerrada al público.

### Masthead

`/masthead` muestra el equipo por cargos. Los retratos se muestran en 9:16, en blanco y negro, y pasan a color con una transición suave al pasar el cursor. Cada persona tiene su **hoja propia** en `/masthead/:slug`: en Dashboard → Masthead, pulsa **Hoja propia** en la persona para editar frase corta, biografía, ciudad, agencia, Instagram, imagen principal, galería (book) y datos libres (altura, temporadas…).

## Público

- **Me gusta:** contador persistente en `public.article_likes`, una vez por navegador. No es un sistema antifraude: alguien con conocimientos técnicos podría inflar el contador.
- **Compartir historia:** copia la URL y confirma “Enlace copiado!”.
- **Newsletter** (portada y `/newsletter`) y el formulario de **Business** guardan en Supabase. Si falla, el visitante ve un error en lugar de una confirmación falsa. Owner/Admin pueden borrar suscriptores y comentarios (spam).

## Sobre el prompt que entrega Supabase

El prompt de Supabase usa `page.tsx`, `next/headers` y `@supabase/ssr` (Next.js). LIGHT usa Vite + React: no copies esos archivos ni uses `NEXT_PUBLIC_*`. El cliente correcto ya está en `client/src/lib/supabase.ts` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
