import { getContentSetting, readCachedSetting, saveContentSetting, useContentSetting } from "./contentSettings";
import { createContext, useContext } from "react";
import { safeImageUrl } from "./utils";

/** Vista previa del Dashboard: las hojas usan estos banners (sin guardar) en vez de los publicados. */
export const BannerDraftContext = createContext<PageBannerOverrides | null>(null);

/**
 * Banners (imagen del hero) de las hojas públicas, editables en Dashboard → Banners.
 * Cada hoja tiene su imagen original; si el equipo pone otra, se guarda aquí (site_settings)
 * y la hoja la usa al momento para todo el público.
 */
export type BannerKey = "moda" | "belleza" | "eventos" | "living" | "runway" | "archivo" | "masthead" | "business" | "about" | "sobre-moda" | "privacidad" | "terminos" | "cookies" | "not-found";
/** focus: encuadre vertical 0–100 %. kicker/title/dek: textos de la cabecera ("" = el original). */
export type BannerOverride = { image: string; focus: number; kicker?: string; title?: string; dek?: string };
export type BannerTexts = { kicker: string; title: string; dek: string };
/**
 * kicker/title/dek: los textos vigentes (los del Dashboard o los originales). En los títulos,
 * un salto de línea es un salto y *así* va en cursiva (ver HeroText). textOverride: solo los cambiados.
 */
export type PageBanner = { image: string; position: string; custom: boolean; ready: boolean; textOverride: Partial<BannerTexts> } & BannerTexts;
export const bannerTextKeys: (keyof BannerTexts)[] = ["kicker", "title", "dek"];

/** Solo https:// o rutas del propio sitio (/images/…): nada de http:// (contenido mixto). */
export function safeBannerUrl(value: string | null | undefined): string {
  const url = safeImageUrl(value);
  return url && (url.startsWith("/") || url.startsWith("https://")) ? url : "";
}

const TRANSPARENT = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
/** texts: los textos originales de la cabecera; "" = se calcula en la hoja (Living, Runway). */
export type BannerPage = { key: BannerKey; label: string; path: string; group: string; image: string; focus: number; texts: BannerTexts };

const unsplash = (id: string, width = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=88`;

export const bannerPages: BannerPage[] = [
  { key: "moda", label: "Moda", path: "/moda", group: "Secciones", image: unsplash("photo-1529139574466-a303027c1d8b", 1500), focus: 50, texts: { kicker: "Moda / ", title: "La forma que viene.", dek: "Diseñadores, prendas e ideas que dibujan otra manera de vestir el presente." } },
  { key: "belleza", label: "Belleza", path: "/belleza", group: "Secciones", image: unsplash("photo-1522335789203-aabd1fc54bc9", 1500), focus: 50, texts: { kicker: "Belleza / ", title: "Habitar la piel.", dek: "Rituales, texturas y voces que imaginan una belleza más propia y sin reglas prestadas." } },
  { key: "eventos", label: "Eventos", path: "/eventos", group: "Secciones", image: unsplash("photo-1511818966892-d7d671e672a2", 1500), focus: 50, texts: { kicker: "Eventos / ", title: "La ciudad nos convoca.", dek: "Encuentros, aperturas y acontecimientos para mirar el presente desde otro lugar." } },
  { key: "living", label: "Living", path: "/living", group: "Secciones", image: unsplash("photo-1566073771259-6a8506099945", 2200), focus: 50, texts: { kicker: "LIGHT Living · The Guide · Edición 2026", title: "Los mejores *lugares*\nde la ciudad,\nelegidos *con calma.*", dek: "" } },
  { key: "runway", label: "Runway", path: "/runway", group: "Secciones", image: unsplash("photo-1509631179647-0177331693ae", 2000), focus: 35, texts: { kicker: "Highlights", title: "", dek: "" } },
  { key: "archivo", label: "Archivo", path: "/archivo", group: "La revista", image: "/images/GTA54.webp", focus: 50, texts: { kicker: "LIGHT / ARCHIVE", title: "LIGHT", dek: "THE COMPLETE ARCHIVE" } },
  { key: "sobre-moda", label: "La revista", path: "/sobre-moda", group: "La revista", image: unsplash("photo-1483985988355-763728e1935b", 1400), focus: 50, texts: { kicker: "LIGHT / La revista", title: "Una revista *para lo que viene.*", dek: "LIGHT observa la cultura visual desde el presente: con curiosidad, criterio y una mirada abierta." } },
  { key: "masthead", label: "Masthead", path: "/masthead", group: "La revista", image: "/images/masthead-hero-final.jpg", focus: 52, texts: { kicker: "LIGHT / PEOPLE", title: "Las personas\n*detrás de la mirada.*", dek: "El equipo que imagina, edita y acompaña las historias de LIGHT." } },
  { key: "about", label: "About Us", path: "/about", group: "La revista", image: "/images/GTA51.webp", focus: 25, texts: { kicker: "LIGHT / About Us", title: "Antes de que esté de moda, *está en LIGHT.*", dek: "LIGHT es una revista digital sobre estilo, belleza, cultura y las ideas que mueven la conversación." } },
  { key: "business", label: "Business", path: "/business", group: "La revista", image: unsplash("photo-1469334031218-e382a71b716b", 1400), focus: 50, texts: { kicker: "LIGHT / BUSINESS", title: "Ideas que\n*se encuentran.*", dek: "Colaboraciones para marcas que comparten una mirada curiosa, contemporánea y cultural." } },
  { key: "privacidad", label: "Privacidad", path: "/privacidad", group: "Legales", image: "/images/living-alentejo-field.jpg", focus: 50, texts: { kicker: "LIGHT / Privacidad", title: "Tu información merece cuidado.", dek: "Cómo LIGHT recopila, utiliza y protege los datos que compartes al leer, participar o suscribirte." } },
  { key: "terminos", label: "Términos", path: "/terminos", group: "Legales", image: "/images/living-oaxaca-street.jpg", focus: 50, texts: { kicker: "LIGHT / Términos", title: "Las reglas de esta conversación.", dek: "Las condiciones que acompañan el uso de LIGHT, sus contenidos y sus espacios de participación." } },
  { key: "cookies", label: "Cookies", path: "/cookies", group: "Legales", image: unsplash("photo-1522335789203-aabd1fc54bc9", 1400), focus: 50, texts: { kicker: "LIGHT / Cookies", title: "Una lectura más clara.", dek: "Qué son las cookies, para qué las usamos y cómo puedes decidir sobre ellas." } },
  { key: "not-found", label: "Página no encontrada (404)", path: "/404", group: "Legales", image: unsplash("photo-1539109136881-3be0616acf4b", 1400), focus: 30, texts: { kicker: "LIGHT / Fuera de edición", title: "Esta página no está *en ninguna edición.*", dek: "Puede que el enlace haya cambiado, que la historia ya no esté publicada o que hayas llegado antes que nosotros. La curiosidad nos gusta: aquí tienes por dónde seguir." } },
];

export const pageBannersKey = "public:page-banners";
export type PageBannerOverrides = Partial<Record<BannerKey, BannerOverride>>;

const clampFocus = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : 50; };
function normalize(value: unknown): PageBannerOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: PageBannerOverrides = {};
  for (const page of bannerPages) {
    const item = (value as Record<string, unknown>)[page.key];
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const image = typeof record.image === "string" ? record.image.trim() : "";
    const entry: BannerOverride = { image, focus: clampFocus(record.focus) };
    for (const key of bannerTextKeys) { const value = typeof record[key] === "string" ? (record[key] as string).trim() : ""; if (value) entry[key] = value; }
    result[page.key] = entry;
  }
  return result;
}

export function bannerFor(key: BannerKey, overrides: PageBannerOverrides): PageBanner {
  const page = bannerPages.find((item) => item.key === key)!;
  const override = overrides[key];
  const image = safeBannerUrl(override?.image) || page.image;
  const focus = override ? override.focus : page.focus;
  const textOverride: Partial<BannerTexts> = {};
  for (const key of bannerTextKeys) if (override?.[key]?.trim()) textOverride[key] = override[key]!.trim();
  return { image, position: `center ${focus}%`, custom: Boolean(override && (safeBannerUrl(override.image) || override.focus !== page.focus)), ready: true, textOverride, ...page.texts, ...textOverride };
}

/** Banner vigente de una hoja (original o el elegido en el Dashboard), en directo. */
export function usePageBanner(key: BannerKey): PageBanner {
  const [overrides, loading] = useContentSetting<PageBannerOverrides>(pageBannersKey, {}, normalize);
  // Primera visita (sin caché): no enseñar la imagen original mientras llega la elegida en el Dashboard.
  const draft = useContext(BannerDraftContext);
  if (draft) return bannerFor(key, draft);
  if (loading && readCachedSetting(pageBannersKey) === null) return { image: TRANSPARENT, position: "center", custom: false, ready: false, textOverride: {}, ...bannerPages.find((item) => item.key === key)!.texts };
  return bannerFor(key, overrides);
}

export async function fetchPageBanners(): Promise<PageBannerOverrides> { return normalize(await getContentSetting<unknown>(pageBannersKey, {})); }
export async function savePageBanners(overrides: PageBannerOverrides) { return saveContentSetting(pageBannersKey, normalize(overrides)); }

/**
 * Guarda solo las hojas que cambiaron respecto a `base` (lo que se cargó), encima de lo último que
 * hay en la base: si otra persona cambió otra hoja mientras tanto, su cambio se conserva.
 */
export async function savePageBannerChanges(base: PageBannerOverrides, next: PageBannerOverrides): Promise<PageBannerOverrides> {
  const latest = await fetchPageBanners();
  const merged: PageBannerOverrides = { ...latest };
  for (const page of bannerPages) {
    if (JSON.stringify(base[page.key]) === JSON.stringify(next[page.key])) continue;
    if (next[page.key]) merged[page.key] = next[page.key]; else delete merged[page.key];
  }
  await savePageBanners(merged);
  return normalize(merged);
}
