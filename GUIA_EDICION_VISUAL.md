# Guía de edición visual de LIGHT

Esta guía explica cómo modificar el contenido y la apariencia de las páginas públicas visibles de LIGHT manteniendo la estructura actual de React/TypeScript.

> **Alcance:** esta guía cubre únicamente la portada, las hojas de sección, las páginas informativas, Runway y las historias públicas. No incluye el Dashboard, el editor de artículos ni la lógica de Supabase.

---

## 1. Regla principal

Los archivos `.tsx` mezclan dos cosas:

- **Contenido visible:** titulares, etiquetas, descripciones, enlaces e imágenes.
- **Estructura visual:** componentes, condiciones, grids y comportamiento de la página.

Para hacer cambios visuales sencillos, modifica únicamente:

- Texto entre etiquetas JSX, por ejemplo: `<h1>Este titular</h1>`.
- URLs de imágenes dentro de los objetos de imágenes.
- URLs de enlaces dentro de `href`.
- Clases CSS ya existentes.
- Reglas de color, espacio, tamaño y responsive en `client/src/index.css`.

Evita modificar estados, funciones, imports o componentes si solo quieres cambiar el aspecto.

---

## 2. Mapa rápido de archivos públicos

| Página visible | Archivo principal | Qué se modifica ahí |
|---|---|---|
| Portada | `client/src/pages/Home.tsx` | Hero, textos, imágenes, navegación de portada y secciones visibles |
| Moda, Belleza, Cultura, Sociedad | `client/src/pages/SectionPage.tsx` | Datos y estructura común de las hojas de sección |
| Archivo, Newsletter, Sobre LIGHT, Contacto y legales | `client/src/pages/InfoPage.tsx` | Textos informativos, formularios, catálogo y enlaces |
| Runway | `client/src/pages/RunwayPage.tsx` | Encabezado, filtros y tarjetas de marcas |
| Ficha de una marca | `client/src/pages/BrandPage.tsx` | Hero, textos e imagen de cada marca |
| Historia fija de portada | `client/src/pages/ArticlePage.tsx` | Texto e imágenes de la historia editorial fija |
| Historias creadas desde el Dashboard | `client/src/pages/DynamicArticlePage.tsx` | Solo el marco visual público; el contenido viene del Dashboard |
| Todos los estilos públicos | `client/src/index.css` | Colores, tipografía, tamaños, espacios, responsive y animaciones |

---

## 3. Cambiar la portada

Archivo:

```text
client/src/pages/Home.tsx
```

### 3.1 Imagen principal

Al principio del archivo existe un objeto parecido a este:

```tsx
const images = {
  hero: "https://...",
  detail: "https://...",
  society: "https://...",
};
```

Para cambiar una imagen, sustituye únicamente la URL:

```tsx
const images = {
  hero: "https://nueva-imagen.com/portada.jpg",
  detail: "https://nueva-imagen.com/detalle.jpg",
  society: "https://nueva-imagen.com/sociedad.jpg",
};
```

Recomendaciones:

- Usa URLs HTTPS.
- Para la imagen principal, una imagen horizontal suele funcionar mejor.
- No borres las comas ni las comillas.
- Mantén los nombres `hero`, `detail` y `society` para no romper sus referencias.

### 3.2 Titular principal

Busca el bloque con `hero-copy`:

```tsx
<div className="hero-copy">
  <SectionLabel>Portada / </SectionLabel>
  <h1>La nueva<br /><em>sensibilidad</em><br />del vestir.</h1>
  <p className="hero-dek">Una exploración de las formas...</p>
</div>
```

Puedes modificar:

- `Portada / `: etiqueta pequeña superior.
- El contenido de `<h1>`: titular principal.
- El contenido de `<p className="hero-dek">`: descripción.

Conserva `<br />` si quieres mantener saltos de línea. Conserva `<em>` si quieres mantener una palabra en cursiva.

Ejemplo:

```tsx
<h1>La ciudad<br /><em>también</em><br />se viste.</h1>
```

### 3.3 Texto del bloque introductorio

Busca `intro-band` y modifica los textos internos. No cambies las clases:

```tsx
<section className="intro-band">
  ...
  <p>El texto introductorio de la portada va aquí.</p>
  ...
</section>
```

### 3.4 Historias destacadas

Busca los bloques con clases como:

```text
feature-grid
editorial-section
story-grid
story-card
```

Puedes cambiar:

- Titulares dentro de `<h2>`.
- Descripciones dentro de `<p>`.
- Etiquetas pequeñas dentro de `.eyebrow`.
- Enlaces en `href`.
- URLs de imágenes en `src`.

No cambies `className` si solo quieres cambiar el contenido.

### 3.5 Botón flotante “Volver arriba”

La lógica está en `Home.tsx` y su diseño en `index.css`.

Para cambiar solo el texto:

```tsx
<span>Volver arriba</span>
```

Para cambiar su posición visual, busca en `index.css`:

```css
.home-back-to-top {
  right: 24px;
  bottom: 26px;
}
```

En mobile se ajusta en la regla `@media (max-width: 700px)`.

---

## 4. Cambiar Moda, Belleza, Cultura o Sociedad

Archivo:

```text
client/src/pages/SectionPage.tsx
```

### 4.1 Datos de cada sección

Al principio del archivo existe un objeto parecido a este:

```tsx
const sections = {
  moda: {
    label: "Moda",
    title: "...",
    dek: "...",
    image: images.moda,
    stories: ["...", "...", "..."]
  },
  belleza: { ... },
  cultura: { ... },
  sociedad: { ... }
};
```

Cada sección puede modificar:

- `label`: nombre de la sección.
- `title`: titular grande.
- `dek`: descripción debajo del titular.
- `image`: imagen principal.
- `stories`: tres títulos de historias destacadas.

Ejemplo:

```tsx
sociedad: {
  label: "Sociedad",
  title: "El gesto propio.",
  dek: "Las voces que abren conversaciones nuevas.",
  image: images.sociedad,
  stories: [
    "El poder de elegir distinto",
    "Cinco creadoras, cinco formas de mirar",
    "La conversación continúa"
  ]
}
```

### 4.2 Imágenes de las secciones

Cambia las URLs en el objeto `images` del mismo archivo. Mantén los nombres de referencia:

```tsx
const images = {
  moda: "https://...",
  belleza: "https://...",
  cultura: "https://...",
  sociedad: "https://..."
};
```

### 4.3 Cambiar la distribución visual

La estructura común está en el componente `SectionPage`. Estas clases controlan las zonas principales:

```text
subpage-hero          // bloque principal con texto e imagen
subpage-hero__copy    // columna de texto
subpage-hero__image   // imagen principal
subpage-intro         // franja introductoria
subpage-stories       // bloque de historias
subpage-story         // tarjeta individual
subpage-marquee       // franja LIGHT inferior
```

La estructura debe conservarse. Para cambiar tamaño, espacios o colores, edita sus reglas en `client/src/index.css`.

---

## 5. Cambiar páginas informativas

Archivo:

```text
client/src/pages/InfoPage.tsx
```

Aquí se encuentran:

- Archivo.
- Newsletter.
- Sobre LIGHT / La revista.
- Contacto.
- Privacidad.
- Términos.
- Cookies.

Busca el objeto de contenidos legales o informativos, normalmente llamado `legalSections`, `infoContent` o similar. Los campos principales son:

```tsx
{
  title: "Título de la página",
  label: "Etiqueta superior",
  dek: "Descripción introductoria",
  note: "Texto destacado"
}
```

Para modificar los textos legales, cambia únicamente el contenido de `title` y `body` dentro de cada sección. No cambies las claves internas como `privacidad`, `terminos` o `cookies` porque se usan para resolver las rutas.

### Catálogo de La revista

El catálogo y los frames de Heyzine también se encuentran en `InfoPage.tsx`. Para cambiar una edición, modifica el identificador o URL del iframe manteniendo sus atributos:

```tsx
<iframe
  allowFullScreen
  allow="autoplay; fullscreen; clipboard-write"
  scrolling="no"
  src="https://heyzine.com/flip-book/ID.html"
/>
```

---

## 6. Cambiar Runway y las marcas

### Página principal de Runway

Archivo:

```text
client/src/pages/RunwayPage.tsx
```

Aquí se modifican:

- Título de la temporada.
- Descripción de Runway.
- Lista de marcas.
- Imágenes de las tarjetas.
- Ciudad de cada marca.

Las clases visuales principales son:

```text
runway-heading
runway-browser
runway-sidebar
runway-grid
runway-card
runway-card__image
runway-card__meta
```

### Página de una marca

Archivo:

```text
client/src/pages/BrandPage.tsx
```

Aquí se modifican el nombre de la marca, ciudad, temporada, etiquetas, descripción e imagen principal.

---

## 7. Cambiar la historia fija de portada

Archivo:

```text
client/src/pages/ArticlePage.tsx
```

Esta es la historia fija `/historias/vestirse-de-futuro`.

Clases principales:

```text
article-hero
article-dek
article-meta
article-body
article-lead
article-columns
article-end
```

Para cambiar el texto, edita el contenido dentro de los elementos JSX. Para cambiar una imagen, sustituye el valor de `src` manteniendo el atributo `alt` descriptivo.

Las historias que se crean desde el Dashboard se renderizan mediante `DynamicArticlePage.tsx` y deben seguir editándose desde el Dashboard.

---

## 8. Modificar colores, tipografía y tamaños

Archivo:

```text
client/src/index.css
```

### Colores globales

Al inicio del archivo están las variables de LIGHT:

```css
:root {
  --ink: #171717;
  --paper: #f3f0ea;
  --paper-deep: #e8e3da;
  --acid: #365a7a;
  --muted: #746f68;
}
```

Uso de cada variable:

| Variable | Uso |
|---|---|
| `--ink` | Texto principal, bordes oscuros y botones |
| `--paper` | Fondo crema principal |
| `--paper-deep` | Fondo crema alternativo |
| `--acid` | Azul editorial de LIGHT y acentos |
| `--muted` | Textos secundarios y metadatos |

Para cambiar la identidad general, empieza por estas variables antes de editar reglas individuales.

### Tipografías

```css
--serif: 'Playfair Display', Georgia, serif;
--sans: 'DM Sans', Arial, sans-serif;
--mono: 'DM Mono', monospace;
```

- `--serif`: titulares editoriales.
- `--sans`: párrafos y textos de lectura.
- `--mono`: etiquetas, navegación y metadatos.

### Navbar y menú

Clases principales:

```text
site-header
 top-line
brand-row
wordmark
main-nav
menu-overlay
menu-overlay__links
```

El navbar compacto al hacer scroll utiliza las reglas CSS que comienzan con:

```css
body.is-scrolling-down .site-header
```

Si solo quieres cambiar su tamaño o margen, modifica esas reglas sin tocar `ScrollAnimations.tsx`.

### Mobile

Las reglas responsive están dentro de bloques como:

```css
@media (max-width: 700px) { ... }
@media (max-width: 820px) { ... }
```

El orden de las reglas importa: las reglas que aparecen más abajo pueden sobrescribir las anteriores.

---

## 9. Cómo cambiar una imagen correctamente

1. Selecciona una imagen con buena resolución.
2. Sube la imagen a un almacenamiento estable o utiliza una URL HTTPS.
3. Sustituye únicamente el valor de `src` o de la constante `images`.
4. Conserva el atributo `alt` y actualízalo si cambia el contenido visual.
5. Comprueba la vista en escritorio y mobile.

Ejemplo:

```tsx
<img
  src="https://dominio.com/nueva-portada.jpg"
  alt="Retrato editorial en tonos crema"
/>
```

No sustituyas imágenes editando archivos dentro de `dist/`. `dist/` se genera nuevamente en cada build.

---

## 10. Flujo seguro de edición

Después de modificar un archivo público:

```bash
cd /home/ubuntu/moda
pnpm check
pnpm build
```

Si ambos comandos terminan correctamente:

```bash
git add client/src/pages/Home.tsx client/src/index.css
git commit -m "Actualizar contenido visual de la portada"
git push origin main
```

Adapta los archivos del comando `git add` a los que realmente hayas cambiado.

Antes de publicar permanentemente:

1. Revisar el Preview.
2. Revisar desktop y mobile.
3. Comprobar navegación y enlaces.
4. Confirmar que las imágenes cargan.
5. Verificar que el Dashboard no fue afectado.
6. Publicar solo después de una confirmación explícita.

---

## 11. Cambios que conviene no hacer manualmente

No modifiques directamente estos directorios o archivos generados:

```text
node_modules/
dist/
```

No edites el Dashboard para cambiar una página pública. El Dashboard tiene su propia lógica y puede afectar datos reales.

No cambies estas piezas si no estás modificando comportamiento:

```text
client/src/lib/editorial.ts
client/src/lib/analytics.ts
client/src/lib/supabase.ts
client/src/components/ArticleDraftEditor.tsx
client/src/pages/AdminDashboard.tsx
```

---

## 12. Ejemplos de solicitudes visuales

Cambios seguros que pueden hacerse siguiendo esta guía:

- “Cambia el titular principal de la portada.”
- “Sustituye la imagen de Sociedad.”
- “Haz que el hero de Moda sea menos alto.”
- “Cambia el azul editorial por un azul más oscuro.”
- “Aumenta el espacio entre las tarjetas en mobile.”
- “Cambia el texto de Sobre LIGHT.”
- “Haz más pequeño el logo del navbar compacto.”

En todos los casos, conserva las clases y la estructura JSX si no necesitas modificar el comportamiento.
