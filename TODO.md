- [x] **Portadas verticales centradas**
  - Las imágenes 9:16 y demás portadas verticales conservan su proporción original y ya no crecen indefinidamente.
  - La altura queda limitada a una proporción razonable del viewport y el título, bajada y metadatos se centran verticalmente frente a la imagen.
  - En móvil la imagen se coloca arriba y el texto debajo, manteniendo una lectura natural.
  - El ajuste se aplica tanto a historias dinámicas como a la historia destacada heredada.

- [x] **Navegación por categorías**
  - La navegación principal debe cubrir Moda, Belleza, Cultura y Sociedad, y adaptarse a escritorio y móvil.

- [x] **Módulos editoriales secundarios**
  - La portada debe presentar una selección curada de artículos con distintas jerarquías visuales.

- [x] **Sección de tendencias**
  - Debe existir una sección de tendencias con contenidos destacados y un tratamiento visual diferenciado.

- [x] **Tarjetas de contenido en español**
  - Las tarjetas deben mostrar imágenes de moda, etiquetas de categoría, titulares y textos de ejemplo en español.

- [x] **Diseño responsive**
  - La experiencia debe estar optimizada para escritorio y móvil, conservando la jerarquía y el ritmo editorial.

- [x] **Microinteracciones premium**
  - Enlaces, navegación, imágenes y tarjetas deben tener estados hover/focus y transiciones elegantes.

- [x] **Pie de página tipo revista**
  - El footer debe incluir identidad de LIGHT, enlaces editoriales, categorías, información legal y canales sociales.

- [x] **Subpáginas navegables**
  - Las categorías Moda, Belleza, Cultura y Sociedad cuentan con rutas independientes, además de Archivo, Newsletter, Sobre LIGHT, Contacto y una página de artículo destacada.
  - La navegación principal, el menú móvil, las tarjetas y el footer enlazan a páginas reales en lugar de depender únicamente de anclas `#`.

- [x] **Dirección visual diferenciada por sección**
  - Moda usa una composición gráfica angular y acentos naranja.
  - Belleza usa una atmósfera suave, formas orgánicas y tonos lavanda.
  - Cultura usa tratamiento arquitectónico, monocromo y azul cobalto.
  - Sociedad usa una atmósfera nocturna, humana y verde mineral.

- [x] **Sección RUNWAY**
  - Existe una pestaña RUNWAY independiente con temporada destacada, buscador de marcas, índice alfabético y cuadrícula de desfiles.
  - La sección tiene navegación propia, tarjetas interactivas y comportamiento responsive para escritorio y móvil.

- [x] **Directorio de marcas y subpáginas RUNWAY**
  - RUNWAY usa el término “Marcas” en lugar de “Diseñadores”.
  - Los filtros de búsqueda y letra incluyen una acción visible “Ver todas las marcas” para regresar al estado inicial.
  - Cada tarjeta de marca abre una subpágina editorial propia en `/runway/:brand` con ciudad, temporada, tags y texto de contexto.
  - La cuadrícula incorpora animaciones de entrada, hover y transición visual sin bloquear la navegación.

- [x] **Animaciones globales**
  - El header, hero, secciones editoriales, tarjetas, imágenes, botones, formularios, menú y footer tienen movimiento sutil y coherente.
  - Se respetan las preferencias de `prefers-reduced-motion` para reducir o desactivar las transiciones.

- [x] **Paleta editorial refinada**
  - El acento rojo/naranja fue reemplazado por azul tinta `#365a7a`, combinado con marfil, negro tinta, gris humo y los acentos propios de cada sección.

- [x] **CMS editorial experimental**
  - El buscador permite navegar contenido y activar el acceso oculto escribiendo `Snow`, `Songbird`, `Moonglow` o `Bianca` y presionando Enter.
  - El acceso muestra una ventana de contraseña y abre `/admin` con roles Owner, Admin y Staff Writer.
  - El dashboard permite ver métricas de demostración, crear historias, editar títulos, bajadas y cuerpo, cargar una imagen local, guardar borradores y publicar solo para Owner/Admin.
  - Las historias publicadas aparecen en la portada del navegador actual.
  - La estructura de Supabase queda preparada en `supabase/schema.sql`, con perfiles, roles, artículos, estados, Storage y políticas RLS.

- [x] **Editor editorial vertical de páginas**
  - Cada historia creada desde Studio se modela como una página con slug propio y ruta pública `/historias/:slug`.
  - El borrador se abre como una maqueta completa del artículo: kicker, título, bajada, autor, tiempo de lectura, fecha, imagen de portada por URL de Imgur, pie de imagen, frase de inicio y bloques de contenido.
  - La vista Páginas muestra el listado con acciones separadas para “Ver borrador”, “Ver página” y “Editar”. Crear página abre directamente el borrador completo.
  - Staff Writer puede guardar páginas en edición; Owner/Admin pueden publicarlas y hacerlas visibles por su URL.
  - Supabase guarda `page_blocks` y metadatos editoriales como JSONB/columnas, mientras el estado `draft`/`published` mantiene el flujo de revisión.
