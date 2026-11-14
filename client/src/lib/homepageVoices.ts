import { getContentSetting, readCachedSetting, saveContentSetting, useContentSetting } from "./contentSettings";

/** Bloque “Cartas de estilo” de la portada (section.voices-section). Se edita en Dashboard → Destacado. */
export type HomepageVoicesContent = {
  label: string;
  title: string;
  titleEmphasis: string;
  image: string;
  imageAlt: string;
  quote: string;
  quoteAuthor: string;
  sideEyebrow: string;
  sideTitle: string;
  sideText: string;
  ctaLabel: string;
  ctaHref: string;
  updatedAt: string;
};

export const homepageVoicesKey = "public:homepage-voices";
export const defaultHomepageVoices: HomepageVoicesContent = {
  label: "Cartas de estilo",
  title: "Una mirada",
  titleEmphasis: "en movimiento.",
  image: "/images/GTA51.webp",
  imageAlt: "Retrato editorial en blanco y negro",
  quote: "La belleza aparece cuando dejamos de perseguirla.",
  quoteAuthor: "Amaia Ortiz, artista",
  sideEyebrow: "Conversaciones",
  sideTitle: "El estilo también es una forma de escuchar.",
  sideText: "Entrevistas, objetos y lugares que amplían la idea de lo contemporáneo.",
  ctaLabel: "Conocer las voces",
  ctaHref: "/sobre-moda",
  updatedAt: "",
};
export const homepageVoicesFields: (keyof HomepageVoicesContent)[] = ["label", "title", "titleEmphasis", "image", "imageAlt", "quote", "quoteAuthor", "sideEyebrow", "sideTitle", "sideText", "ctaLabel", "ctaHref"];

const normalize = (value: unknown): HomepageVoicesContent => ({ ...defaultHomepageVoices, ...(value && typeof value === "object" ? value as Partial<HomepageVoicesContent> : {}) });

/** Último valor conocido (instantáneo, desde caché). */
export function getHomepageVoices(): HomepageVoicesContent { return normalize(readCachedSetting(homepageVoicesKey)); }
export async function fetchHomepageVoices(): Promise<HomepageVoicesContent> { return normalize(await getContentSetting<unknown>(homepageVoicesKey, defaultHomepageVoices)); }
export async function saveHomepageVoices(value: HomepageVoicesContent) { return saveContentSetting(homepageVoicesKey, value); }
export function useHomepageVoices() { return useContentSetting(homepageVoicesKey, defaultHomepageVoices, normalize); }
