import { getContentSetting, readCachedSetting, saveContentSetting, useContentSetting } from "./contentSettings";

export type HomepageFeatureContent = { eyebrow: string; title: string; excerpt: string; author: string; readingTime: string; asideQuote: string; image: string; ctaLabel: string; ctaHref: string; updatedAt: string };
export const homepageFeatureKey = "public:homepage-feature";
export const defaultHomepageFeature: HomepageFeatureContent = { eyebrow: "Moda", title: "Vestirse de futuro.", excerpt: "Las prendas ya no siguen una sola dirección. Un armario más libre mezcla memoria, tecnología y una nueva idea de lo que significa estar bien vestido.", author: "Inés Valdés", readingTime: "12 min de lectura", asideQuote: "La elegancia no es una respuesta: es una forma de hacer preguntas.", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=90", ctaLabel: "Leer el artículo", ctaHref: "", updatedAt: "" };

const normalize = (value: unknown): HomepageFeatureContent => ({ ...defaultHomepageFeature, ...(value && typeof value === "object" ? value as Partial<HomepageFeatureContent> : {}) });

/** Last known value (instant, from cache). */
export function getHomepageFeature(): HomepageFeatureContent { return normalize(readCachedSetting(homepageFeatureKey)); }
export async function fetchHomepageFeature(): Promise<HomepageFeatureContent> { return normalize(await getContentSetting<unknown>(homepageFeatureKey, defaultHomepageFeature)); }
export async function saveHomepageFeature(value: HomepageFeatureContent) { return saveContentSetting(homepageFeatureKey, value); }
export function useHomepageFeature() { return useContentSetting(homepageFeatureKey, defaultHomepageFeature, normalize); }
