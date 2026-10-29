# LIGHT Studio — CMS editorial

Esta rama experimental incluye un CMS privado activado desde el buscador. Es una demo funcional para probar la experiencia antes de conectar autenticación y persistencia real.

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

No usar esta contraseña en producción. Actualmente el prototipo guarda sesión en `sessionStorage` y artículos en `localStorage`.

## Permisos

- Owner y Admin pueden guardar borradores, editar y publicar.
- Staff Writer puede crear y editar borradores, pero no publicar.
- Las historias publicadas aparecen en la portada dentro de la selección editorial del navegador actual.

## Editor editorial

Cada historia se crea como una página editorial con slug propio. El borrador se abre como la maqueta completa del artículo, no como un formulario aislado: kicker, título, bajada, autor, fecha, tiempo de lectura, portada por URL de Imgur, pie de imagen, frase de inicio y bloques verticales de texto, citas, separadores e imágenes. La sección Páginas permite ver el borrador, abrir la página publicada o volver a editarla. Los bloques se guardan en `articles.page_blocks` como JSONB y una página publicada se renderiza en `/historias/:slug`.

## Migración a Supabase

1. Crear un proyecto Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor.
3. Activar Supabase Auth y crear los cuatro usuarios reales.
4. Crear sus filas en `public.profiles` con los roles `owner`, `admin` o `staff_writer`.
5. Añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como variables públicas del frontend. El cliente compatible con Vite ya está en `client/src/lib/supabase.ts`.
6. Sustituir `editorialRepository` en `client/src/lib/editorial.ts` por llamadas a `supabase.from('articles')` y Supabase Storage.
7. Mover la validación definitiva de publicación a una Edge Function o a una política RLS; nunca confiar solo en la interfaz.

### Sobre el prompt que entrega Supabase

El prompt recibido usa `page.tsx`, `next/headers`, `NextRequest` y `@supabase/ssr`. Es correcto para Next.js, pero LIGHT usa Vite + React + Express. Por eso aquí no se deben copiar esos archivos ni usar `NEXT_PUBLIC_*`. En esta aplicación se utiliza `@supabase/supabase-js`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

El buscador oculto es una forma cómoda de descubrir el acceso, no el mecanismo de seguridad. En producción, Supabase Auth, RLS y las políticas de publicación deben ser la autoridad real.
