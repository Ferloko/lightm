import { getContentSetting, readCachedSetting, saveContentSetting, useContentSetting } from "./contentSettings";
import { safeImageUrl } from "./utils";

/**
 * Banners (imagen del hero) de las hojas públicas, editables en Dashboard → Banners.
 * Cada hoja tiene su imagen original; si el equipo pone otra, se guarda aquí (site_settings)
 * y la hoja la usa al momento para todo el público.
 */
export type BannerKey = "moda" | "belleza" | "eventos" | "sociedad" | "living" | "runway" | "archivo" | "masthead" | "business" | "about" | "sobre-moda" | "newsletter" | "privacidad" | "terminos" | "cookies" | "not-found";
export type BannerOverride = { image: string; focus: number };          // focus: encuadre vertical 0–100 %
export type PageBanner = { image: string; position: string; custom: boolean; ready: boolean };

/** Solo https:// o rutas del propio sitio (/images/…): nada de http:// (contenido mixto). */
export function safeBannerUrl(value: string | null | undefined): string {
  const url = safeImageUrl(value);
  return url && (url.startsWith("/") || url.startsWith("https://")) ? url : "";
}

const TRANSPARENT = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
export type BannerPage = { key: BannerKey; label: string; path: string; group: string; image: string; focus: number };

const unsplash = (id: string, width = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=88`;

export const bannerPages: BannerPage[] = [
  { key: "moda", label: "Moda", path: "/moda", group: "Secciones", image: unsplash("photo-1529139574466-a303027c1d8b", 1500), focus: 50 },
  { key: "belleza", label: "Belleza", path: "/belleza", group: "Secciones", image: unsplash("photo-1522335789203-aabd1fc54bc9", 1500), focus: 50 },
  { key: "eventos", label: "Eventos", path: "/eventos", group: "Secciones", image: unsplash("photo-1511818966892-d7d671e672a2", 1500), focus: 50 },
  { key: "sociedad", label: "Sociedad", path: "/sociedad", group: "Secciones", image: unsplash("photo-1539109136881-3be0616acf4b", 1500), focus: 50 },
  { key: "living", label: "Living", path: "/living", group: "Secciones", image: unsplash("photo-1566073771259-6a8506099945", 2200), focus: 50 },
  { key: "runway", label: "Runway", path: "/runway", group: "Secciones", image: unsplash("photo-1509631179647-0177331693ae", 2000), focus: 35 },
  { key: "archivo", label: "Archivo", path: "/archivo", group: "La revista", image: "/images/GTA54.webp", focus: 50 },
  { key: "sobre-moda", label: "La revista", path: "/sobre-moda", group: "La revista", image: unsplash("photo-1483985988355-763728e1935b", 1400), focus: 50 },
  { key: "masthead", label: "Masthead", path: "/masthead", group: "La revista", image: "/images/masthead-hero-final.jpg", focus: 52 },
  { key: "about", label: "About Us", path: "/about", group: "La revista", image: "/images/GTA51.webp", focus: 25 },
  { key: "business", label: "Business", path: "/business", group: "La revista", image: unsplash("photo-1469334031218-e382a71b716b", 1400), focus: 50 },
  { key: "newsletter", label: "Newsletter", path: "/newsletter", group: "La revista", image: "/images/GTA54.webp", focus: 30 },
  { key: "privacidad", label: "Privacidad", path: "/privacidad", group: "Legales", image: "/images/living-alentejo-field.jpg", focus: 50 },
  { key: "terminos", label: "Términos", path: "/terminos", group: "Legales", image: "/images/living-oaxaca-street.jpg", focus: 50 },
  { key: "cookies", label: "Cookies", path: "/cookies", group: "Legales", image: unsplash("photo-1522335789203-aabd1fc54bc9", 1400), focus: 50 },
  { key: "not-found", label: "Página no encontrada (404)", path: "/404", group: "Legales", image: unsplash("photo-1539109136881-3be0616acf4b", 1400), focus: 30 },
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
    result[page.key] = { image, focus: clampFocus(record.focus) };
  }
  return result;
}

export function bannerFor(key: BannerKey, overrides: PageBannerOverrides): PageBanner {
  const page = bannerPages.find((item) => item.key === key)!;
  const override = overrides[key];
  const image = safeBannerUrl(override?.image) || page.image;
  const focus = override ? override.focus : page.focus;
  return { image, position: `center ${focus}%`, custom: Boolean(override && (safeBannerUrl(override.image) || override.focus !== page.focus)), ready: true };
}

/** Banner vigente de una hoja (original o el elegido en el Dashboard), en directo. */
export function usePageBanner(key: BannerKey): PageBanner {
  const [overrides, loading] = useContentSetting<PageBannerOverrides>(pageBannersKey, {}, normalize);
  // Primera visita (sin caché): no enseñar la imagen original mientras llega la elegida en el Dashboard.
  if (loading && readCachedSetting(pageBannersKey) === null) return { image: TRANSPARENT, position: "center", custom: false, ready: false };
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
