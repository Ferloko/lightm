import { supabase } from "@/lib/supabase";

/**
 * Facebrowser es la red social de GTA World, la única que usa LIGHT.
 *
 * - VITE_FACEBROWSER_URL: dirección base de Facebrowser (para convertir @usuario en enlace).
 * - VITE_FACEBROWSER_LIGHT_PAGE: perfil de LIGHT en Facebrowser (enlace del pie de página).
 *   Por defecto, la página oficial: https://face-es.gta.world/page/light
 *
 * Sin esas variables el nombre se muestra sin enlace: no inventamos direcciones.
 */
export const FACEBROWSER_URL = String(import.meta.env.VITE_FACEBROWSER_URL || "").replace(/\/+$/, "");
export const FACEBROWSER_LIGHT_PAGE = String(import.meta.env.VITE_FACEBROWSER_LIGHT_PAGE || "https://face-es.gta.world/page/light");

const safeHttp = (value: string) => /^https?:\/\//i.test(value) ? value : null;

/** Enlace a un perfil a partir de una URL completa o de un @usuario. */
export function facebrowserProfileUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return safeHttp(trimmed);
  const handle = trimmed.replace(/^@/, "");
  return FACEBROWSER_URL && handle ? `${FACEBROWSER_URL}/${encodeURIComponent(handle)}` : null;
}

export function facebrowserLabel(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? "Facebrowser" : `@${trimmed.replace(/^@/, "")}`;
}

export const lightFacebrowserUrl = safeHttp(FACEBROWSER_LIGHT_PAGE);

/** Una "foto" de la cuenta, tal como la registra la Edge Function facebrowser-ingest. */
export type FacebrowserSnapshot = {
  capturedAt: string;
  account: string;
  followers: number | null;
  posts: number | null;
  impressions: number | null;
  interactions: number | null;
  profileVisits: number | null;
  source: string;
};

export type FacebrowserMetrics =
  | { status: "ok"; latest: FacebrowserSnapshot; previous: FacebrowserSnapshot | null; history: FacebrowserSnapshot[] }
  | { status: "empty" }          // la tabla existe, pero la API aún no ha enviado datos
  | { status: "not_configured" } // falta la migración (o no hay Supabase)
  | { status: "error"; message: string };

const nullableCount = (value: unknown) => typeof value === "number" ? value : null;

/** Últimas fotos de la cuenta de LIGHT en Facebrowser, de la más reciente a la más antigua. */
export async function fetchFacebrowserMetrics(account = "light", limit = 30): Promise<FacebrowserMetrics> {
  if (!supabase) return { status: "not_configured" };
  const { data, error } = await supabase.from("facebrowser_metrics").select("captured_at,account,followers,posts,impressions,interactions,profile_visits,source").eq("account", account).order("captured_at", { ascending: false }).limit(limit);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|Could not find the table/i.test(error.message)) return { status: "not_configured" };
    return { status: "error", message: error.message };
  }
  const history: FacebrowserSnapshot[] = (data || []).map((row: Record<string, unknown>) => ({ capturedAt: String(row.captured_at), account: String(row.account), followers: nullableCount(row.followers), posts: nullableCount(row.posts), impressions: nullableCount(row.impressions), interactions: nullableCount(row.interactions), profileVisits: nullableCount(row.profile_visits), source: String(row.source || "api") }));
  if (!history.length) return { status: "empty" };
  return { status: "ok", latest: history[0], previous: history[1] || null, history };
}
