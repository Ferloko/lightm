import { supabase } from "@/lib/supabase";

/**
 * Facebrowser es la red social de GTA World, la única que usa LIGHT.
 *
 * - VITE_FACEBROWSER_URL: dirección base de Facebrowser (por defecto https://face-es.gta.world).
 *   Un @usuario se convierte en {base}/profile/{usuario}, p. ej. https://face-es.gta.world/profile/snow
 * - VITE_FACEBROWSER_LIGHT_PAGE: perfil de LIGHT en Facebrowser (enlace del pie de página).
 *   Por defecto, la página oficial: https://face-es.gta.world/page/light
 *
 */
export const FACEBROWSER_URL = String(import.meta.env.VITE_FACEBROWSER_URL || "https://face-es.gta.world").replace(/\/+$/, "");
export const FACEBROWSER_LIGHT_PAGE = String(import.meta.env.VITE_FACEBROWSER_LIGHT_PAGE || "https://face-es.gta.world/page/light");

const safeHttp = (value: string) => /^https?:\/\//i.test(value) ? value : null;

/** Enlace a un perfil a partir de una URL completa o de un @usuario. */
export function facebrowserProfileUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return safeHttp(trimmed);
  const handle = trimmed.replace(/^@/, "");
  return FACEBROWSER_URL && handle ? `${FACEBROWSER_URL}/profile/${encodeURIComponent(handle)}` : null;
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
  if (!supabase) { const history = readDemoSnapshots().filter((item) => item.account === account).slice(0, limit); return history.length ? { status: "ok", latest: history[0], previous: history[1] || null, history } : { status: "empty" }; }
  const { data, error } = await supabase.from("facebrowser_metrics").select("captured_at,account,followers,posts,impressions,interactions,profile_visits,source").eq("account", account).order("captured_at", { ascending: false }).limit(limit);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|Could not find the table/i.test(error.message)) return { status: "not_configured" };
    return { status: "error", message: error.message };
  }
  const history: FacebrowserSnapshot[] = (data || []).map((row: Record<string, unknown>) => ({ capturedAt: String(row.captured_at), account: String(row.account), followers: nullableCount(row.followers), posts: nullableCount(row.posts), impressions: nullableCount(row.impressions), interactions: nullableCount(row.interactions), profileVisits: nullableCount(row.profile_visits), source: String(row.source || "api") }));
  if (!history.length) return { status: "empty" };
  return { status: "ok", latest: history[0], previous: history[1] || null, history };
}

/* ── Cifras escritas a mano por Owner/Admin (Dashboard → Resumen → Redes de LIGHT) ── */

export type FacebrowserCounts = Pick<FacebrowserSnapshot, "followers" | "posts" | "impressions" | "interactions" | "profileVisits">;
const DEMO_KEY = "light.demo.facebrowser-metrics";
function readDemoSnapshots(): FacebrowserSnapshot[] { try { const value = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }

/** Guarda una nueva foto de la cuenta con las cifras escritas a mano (fuente: "manual · Nombre"). */
export async function saveFacebrowserSnapshot(counts: FacebrowserCounts, editor: string, account = "light") {
  const snapshot: FacebrowserSnapshot = { ...counts, capturedAt: new Date().toISOString(), account, source: `manual · ${editor || "LIGHT"}`.slice(0, 80) };
  if (!supabase) { try { localStorage.setItem(DEMO_KEY, JSON.stringify([snapshot, ...readDemoSnapshots()].slice(0, 200))); } catch { /* demo */ } return snapshot; }
  const { error } = await supabase.from("facebrowser_metrics").insert({ account, followers: counts.followers, posts: counts.posts, impressions: counts.impressions, interactions: counts.interactions, profile_visits: counts.profileVisits, source: snapshot.source, raw: { manual: true, editor } });
  if (error) throw error;
  return snapshot;
}
