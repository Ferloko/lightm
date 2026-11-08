# LIGHT Studio — CMS editorial

Esta rama experimental incluye un CMS privado activado desde el buscador. Puede funcionar en modo demostración local o conectarse a Supabase Auth y a las tablas editoriales para persistencia compartida.

## Acceso temporal

En el buscador escribe exactamente uno de estos nombres y presiona Enter:

- `Snow` → Owner
- `Songbird` → Admin
- `Moonglow` → Staff Writer
- `Bianca` → Staff Writer

La contraseña temporal de desarrollo para los cuatro perfiles es:

```text
MODA-DEMO-2026
```

Para conectar Supabase Auth, crea estos usuarios con esa contraseña temporal o con contraseñas reales:

- `snow@moda.studio` — Owner
- `songbird@moda.studio` — Admin
- `moonglow@moda.studio` — Staff Writer
- `bianca@moda.studio` — Staff Writer

No uses esta contraseña en producción. Con Supabase configurado, la sesión y los artículos se guardan en sus servicios remotos. Sin credenciales, la vista previa usa almacenamiento local del navegador para la demostración.

## Permisos

- Owner y Admin pueden guardar borradores, editar y publicar.
- Staff Writer puede crear y editar borradores, pero no publicar.
- Las historias publicadas aparecen en la portada dentro de la selección editorial del navegador actual.

## Editor editorial
Las categorías disponibles incluyen Moda, Belleza, Eventos, Sociedad, Living y Archivo. Los artículos de Eventos se muestran automáticamente en la hoja `/eventos` cuando están publicados y visibles. Si Supabase no está configurado en la vista previa, la demo guarda los artículos en el almacenamiento local de ese navegador; para persistencia compartida o producción, usa Supabase. El campo “Orden dentro de la selección” comparte la numeración entre Must-Reads y Homepage / Selección: un número menor aparece antes. El Hero solo muestra una historia estática, sin carrusel, y el orden no cambia su contenido.

Cada historia se crea como una página editorial con slug propio. El borrador se abre como la maqueta completa del artículo, no como un formulario aislado: kicker, título, bajada, autor, fecha, tiempo de lectura, portada por URL de Imgur, pie de imagen, frase de inicio y bloques verticales de texto, citas, separadores e imágenes. La sección Páginas permite ver el borrador, abrir la página publicada o volver a editarla. Los bloques se guardan en `articles.page_blocks` como JSONB y una página publicada se renderiza en `/historias/:slug`.

## Masthead y Business

La hoja pública `/masthead` presenta el roster del equipo. Owner/Admin pueden abrir la pestaña **Masthead** del Dashboard para editar cargos, añadir o quitar posiciones y cambiar el orden. Cada cargo admite varias personas; para cada integrante puedes editar nombre y URL https del retrato. Las personas se agrupan en horizontal y pasan a otra fila cuando no cabe más contenido. Los ocho cargos iniciales son Head of Global Editorial, Assistant Global Editorial, Cast & Talent Director, Senior Fashion Editor, Supermodel, Runway Model, New Face Up y Staff Writer. Los nombres y retratos se incorporan desde Dashboard cuando el equipo los tenga.

Con Supabase, el roster se guarda como JSONB en `public.site_settings`, bajo la clave `public:masthead-team`; la lectura pública queda limitada a claves `public:*` y solo Owner/Admin pueden escribirlas. En preview sin Supabase, la edición se conserva en el almacenamiento local de ese navegador. Para aplicar la tabla y sus políticas en una base ya existente, ejecuta `supabase/migrations/20261107_add_public_site_settings.sql`. Business está disponible en `/business` y sustituye la hoja independiente Contacto; el formulario de colaboraciones guarda nombre, apellido, correo y comentario. Los envíos aparecen en la pestaña privada **Comentarios** del Dashboard, visible para Owner/Admin; ejecuta `supabase/migrations/20261108_add_contact_submissions.sql` para habilitar recepción remota, lectura editorial y políticas RLS. En preview sin Supabase, los comentarios se guardan localmente en el navegador.

Masthead y Business no forman parte de la barra horizontal: están en el menú de tres líneas y en el pie del sitio.

## Migración a Supabase

1. Crear un proyecto Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor.
3. Activar Supabase Auth y crear los cuatro usuarios reales.
4. Crear sus filas en `public.profiles` con los roles `owner`, `admin` o `staff_writer`.
5. Añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como variables públicas del frontend. El cliente compatible con Vite ya está en `client/src/lib/supabase.ts`.
6. Verificar que las políticas RLS permitan a los editores administrar contenido y que las consultas de artículos y `site_settings` funcionen con las credenciales públicas configuradas.
7. Mover la validación definitiva de publicación a una Edge Function o a una política RLS; nunca confiar solo en la interfaz.

### Sobre el prompt que entrega Supabase

El prompt recibido usa `page.tsx`, `next/headers`, `NextRequest` y `@supabase/ssr`. Es correcto para Next.js, pero LIGHT usa Vite + React + Express. Por eso aquí no se deben copiar esos archivos ni usar `NEXT_PUBLIC_*`. En esta aplicación se utiliza `@supabase/supabase-js`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

El buscador oculto es una forma cómoda de descubrir el acceso, no el mecanismo de seguridad. En producción, Supabase Auth, RLS y las políticas de publicación deben ser la autoridad real.
