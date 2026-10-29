export type MagazinePreviewPage = {
  label: string;
  title: string;
  text: string;
  image: string;
};

export type MagazineEdition = {
  number: string;
  title: string;
  date: string;
  src: string;
  tone: "dark" | "light";
  dek: string;
  coverKicker: string;
  coverTitle: string;
  coverNote: string;
  coverImage: string;
  previewPages: MagazinePreviewPage[];
};

const images = {
  hero: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=90",
  silhouette: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=90",
  portrait: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=90",
  beauty: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=90",
  culture: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=90",
  detail: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=90",
};

export const editions: MagazineEdition[] = [
  {
    number: "01",
    title: "Edición inaugural",
    date: "Archivo digital",
    src: "https://heyzine.com/flip-book/6a853c2672.html",
    tone: "dark",
    dek: "El primer gesto de LIGHT: una mirada abierta al estilo, la imagen y las conversaciones que permanecen.",
    coverKicker: "LIGHT / ARCHIVO",
    coverTitle: "Mirar de cerca",
    coverNote: "Estilo · Cultura · Sociedad",
    coverImage: images.hero,
    previewPages: [
      { label: "02 / Ensayo", title: "La forma de estar", text: "Una conversación sobre vestir, habitar y elegir con intención.", image: images.silhouette },
      { label: "08 / Perfil", title: "El gesto propio", text: "Personas que convierten la intuición en una manera de mirar.", image: images.portrait },
      { label: "16 / Archivo", title: "Objetos con memoria", text: "Piezas, texturas y pequeños rituales que cuentan una época.", image: images.detail },
      { label: "24 / Belleza", title: "Piel de invierno", text: "La belleza como cuidado, tiempo y presencia.", image: images.beauty },
      { label: "32 / Cultura", title: "La ciudad como estudio", text: "Lugares para perderse y volver a encontrar una idea.", image: images.culture },
      { label: "40 / Cierre", title: "Una nota final", text: "Lo que queda cuando dejamos de mirar deprisa.", image: images.hero },
    ],
  },
  {
    number: "02",
    title: "La conversación de estilo",
    date: "Edición actual",
    src: "https://heyzine.com/flip-book/cfb0eadb91.html",
    tone: "light",
    dek: "Una edición sobre la identidad visual, los cambios de temporada y aquello que nos permite reconocernos.",
    coverKicker: "LIGHT / EDICIÓN 02",
    coverTitle: "La conversación de estilo",
    coverNote: "Moda · Belleza · Ideas",
    coverImage: images.silhouette,
    previewPages: [
      { label: "04 / Apertura", title: "Todo cambia de forma", text: "Una entrada visual a la temporada que empieza.", image: images.hero },
      { label: "12 / Moda", title: "Vestirse de futuro", text: "Siluetas nuevas para preguntas que ya conocemos.", image: images.detail },
      { label: "20 / Conversación", title: "El lenguaje de la imagen", text: "Cuando una fotografía deja de ilustrar y empieza a decir.", image: images.portrait },
      { label: "28 / Belleza", title: "La materia del rostro", text: "Texturas, gestos y una rutina entendida como pausa.", image: images.beauty },
      { label: "36 / Sociedad", title: "Voces en presente", text: "Personas que están moviendo la conversación.", image: images.culture },
      { label: "44 / Última página", title: "Para volver a mirar", text: "Una selección breve para cerrar la edición.", image: images.silhouette },
    ],
  },
];

export function getMagazineEdition(number: string) {
  return editions.find((edition) => edition.number === number);
}
