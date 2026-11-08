- [x] **Portadas verticales centradas**
  - Las imágenes 9:16 y demás portadas verticales conservan su proporción original y ya no crecen indefinidamente.
  - La altura queda limitada a una proporción razonable del viewport y el título, bajada y metadatos se centran verticalmente frente a la imagen.
  - En móvil la imagen se coloca arriba y el texto debajo, manteniendo una lectura natural.
  - El ajuste se aplica tanto a historias dinámicas como a la historia destacada heredada.

- [x] **Reemplazar Cultura por Eventos y conectar sus artículos**
  - La hoja que se llamaba Cultura se identifica como Eventos, aparece así en la navegación y tiene un hero editorial nuevo con una composición inspirada en Living.
  - Eventos muestra únicamente historias publicadas cuya categoría es Eventos; las categorías históricas de Cultura no se convierten automáticamente en cobertura de eventos.
  - El Dashboard permite crear y editar artículos con la categoría Eventos; al publicarlos y hacerlos visibles, aparecen en Eventos y sus páginas se pueden abrir.
  - Los enlaces antiguos a `/cultura` siguen llevando a la nueva hoja de Eventos.
  - La hoja incluye una introducción editorial propia para dar contexto a la cobertura de encuentros y eventos.

- [x] **Actualizar Moda y Belleza para mostrar artículos por categoría**
  - Moda muestra los artículos publicados de la categoría Moda y Belleza muestra los artículos publicados de la categoría Belleza.
  - Ambas páginas usan una composición de hero nueva, inspirada en el hero de Living, en lugar de las composiciones anteriores.
  - Cada tarjeta lleva a la página pública correspondiente y muestra su contenido editorial; se conserva un estado vacío útil cuando no hay artículos publicados.

- [x] **Completar el cierre de la hoja Living**
  - Living conserva sus secciones actuales y su agenda.
  - El final de la hoja incluye un pie completo de LIGHT con navegación a secciones, información de la revista, redes, enlaces legales y cierre editorial.
  - La navegación del pie y del encabezado identifica Eventos en lugar de Cultura.

- [x] **Mejorar Living y legibilidad en modo oscuro**
  - Living Intro tiene una imagen de fondo desenfocada y una capa de contraste que mantiene el texto claramente legible en claro y oscuro.
  - Trend Section y el Dashboard conservan contraste suficiente para textos, menús y paneles cuando se activa Dark Mode.

- [x] **Completar el grid de destinos Living**
  - El grid pasa de tres a cinco tarjetas; las dos nuevas ocupan la segunda fila, alineadas a la derecha.
  - Debajo de toda la cuadrícula aparece un cierre editorial breve y responsivo.

- [x] **Hacer útil y explícito el orden editorial**
  - El orden manual se aplica a las listas con varios artículos (Selección de portada y Must-Reads).
  - El hero permanece en una sola historia estática, sin carrusel; la interfaz deja clara esa diferencia.


- [x] **Mejorar contraste de footer y KPIs en modo oscuro**
  - El pie de Living mantiene fondo y colores de texto con contraste legible, tanto en tema claro como en oscuro.
  - Las tarjetas de KPI y sus etiquetas, métricas y notas se leen con claridad en Dark Mode.

- [x] **Ordenar la cuadrícula Living y quitar destinos a Contacto**
  - Las cinco tarjetas de destino tienen imágenes cuadradas, tamaño uniforme y una cuadrícula ordenada que responde a móvil.
  - Las tarjetas y acciones de Living que ahora solo enlazan a `/contacto` dejan de ser enlaces; se conservan únicamente las rutas funcionales o necesarias, como la cobertura de Eventos.

- [x] **Crear Masthead editable desde Dashboard**
  - Se crea `/masthead` como presentación clara del equipo LIGHT con los cargos Head of Global Editorial, Assistant Global Editorial, Cast & Talent Director, Senior Fashion Editor, Supermodel, Runway Model, New Face Up y Staff Writer.
  - El Dashboard permite editar cargos y nombres, además de añadir, quitar y reordenar integrantes; los cambios guardados se reflejan en la hoja pública.
  - La edición usa almacenamiento compartido de Supabase cuando está configurado y almacenamiento local de demostración si no lo está.

- [x] **Crear hoja Business y conectarla a la navegación**
  - Se crea `/business` como hoja informativa de oportunidades de negocio, colaboraciones editoriales y contacto comercial, sin inventar cifras ni datos de contacto.
  - Masthead y Business aparecen en el menú de tres líneas y en los pies pertinentes, pero no en la barra horizontal; ambas rutas se registran en los manifests públicos.


- [x] **Añadir retratos y grupos de personas al Masthead**
  - Cada integrante puede tener nombre y fotografía; cada cargo admite una o varias personas.
  - Las personas de un mismo cargo se muestran en fila horizontal y, al superar el ancho disponible, continúan en una fila inferior del mismo grupo.
  - El Dashboard permite editar y ordenar cargos e integrantes, añadir o retirar personas y actualizar sus imágenes; los registros existentes sin foto o con un único nombre se conservan.

- [x] **Convertir Business en la página de contacto y recibir comentarios**
  - Se elimina la página independiente de Contacto; las rutas y enlaces anteriores de contacto llevan a Business.
  - Business incluye debajo de la información comercial un formulario con nombre, apellido, correo y comentario, y un botón de envío.
  - Los envíos se guardan y aparecen en una pestaña del Dashboard llamada **Comentarios**, con acceso reservado a Owner/Admin; el modo de demostración los guarda localmente si Supabase no está configurado.

- [x] **Corregir el formato de la página Moda**
  - La hoja Moda recupera una composición legible y coherente con las hojas editoriales LIGHT, en escritorio y móvil.
  - Los artículos publicados y visibles de categoría Moda continúan enlazando a sus páginas; si no hay artículos, aparece un estado vacío claro.


- [x] **Añadir fondo editorial al hero de Masthead**
  - `masthead-hero` utiliza una imagen de fondo con contraste suficiente para leer todo el texto en claro, oscuro y móvil.

- [x] **Alinear retratos con el nombre del cargo**
  - En cada grupo del roster, el inicio de las imágenes se alinea con el inicio del texto del cargo, no con la parte superior de la fila.
  - En móvil, los retratos siguen apareciendo debajo del nombre del cargo.
