import { useContentSetting } from "./contentSettings";
import { saveContentSetting } from "./contentSettings";

/** Menú lateral (las tres rayas) de la portada y las hojas públicas: imagen y textos, en Dashboard → Destacado. */
export type SiteMenuContent = { image: string; focus: number; caption: string; note: string };
export const siteMenuKey = "public:site-menu";
export const defaultSiteMenu: SiteMenuContent = { image: "/images/GTA52.webp", focus: 50, caption: "LIGHT / Editorial campaign", note: "Historias para mirar más de cerca." };

const text = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;
export function normalizeSiteMenu(value: unknown): SiteMenuContent {
  if (!value || typeof value !== "object") return defaultSiteMenu;
  const record = value as Record<string, unknown>;
  const focus = Number(record.focus);
  return { image: text(record.image, defaultSiteMenu.image).trim(), focus: Number.isFinite(focus) ? Math.min(100, Math.max(0, Math.round(focus))) : 50, caption: text(record.caption, defaultSiteMenu.caption), note: text(record.note, defaultSiteMenu.note) };
}
export function useSiteMenu() { return useContentSetting(siteMenuKey, defaultSiteMenu, normalizeSiteMenu); }
export function saveSiteMenu(value: SiteMenuContent) { return saveContentSetting(siteMenuKey, normalizeSiteMenu(value)); }
