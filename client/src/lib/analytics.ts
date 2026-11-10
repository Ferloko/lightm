import { supabase } from "@/lib/supabase";

const LOCAL_KEY = "light_page_views";

const VISITOR_KEY = "light_visitor_id";

type LocalView = { path: string; viewedAt: string; visitorId?: string };
export type PageViewPoint = { date: string; label: string; count: number };
/** `visitors` counts identified browsers; `untrackedViews` are visits recorded before visitor ids existed (they cannot be attributed). */
export type PageViewSummary = { views: number; visitors: number | null; untrackedViews: number; todayViews: number };

/** The RPC does not exist yet on this database (migration not applied). Any other error is a real failure. */
function isMissingFunction(error: { code?: string; message?: string } | null) { return Boolean(error && (error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message || ""))); }

/** Anonymous, random per-browser id used only to count unique visitors (no personal data). */
export function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) { id = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`); localStorage.setItem(VISITOR_KEY, id); }
    return id;
  } catch { return null; }
}

function readLocalViews(): LocalView[] {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is LocalView => Boolean(item?.viewedAt)) : [];
  } catch {
    return [];
  }
}

export async function trackPageView(path: string) {
  if (path.startsWith("/admin") || path.startsWith("/404")) return;
  if (/^\/historias\//i.test(path)) path = path.toLowerCase();
  if (supabase) {
    const visitorId = getVisitorId();
    let { error } = await supabase.from("page_views").insert({ path: path.slice(0, 300), ...(visitorId ? { visitor_id: visitorId } : {}) });
    // Database without the visitors migration yet: keep counting views.
    if (error && visitorId && (error.code === "PGRST204" || error.code === "42703")) ({ error } = await supabase.from("page_views").insert({ path: path.slice(0, 300) }));
    if (error) console.warn("[LIGHT] Page view tracking unavailable", error.message);
    return;
  }
  const views = readLocalViews();
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify([...views.slice(-4999), { path, viewedAt: new Date().toISOString(), visitorId: getVisitorId() || undefined }])); } catch { /* demo only */ }
}

const timeZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
function localDay(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function label(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(".", ""); }

/** Daily views for the last `days` days, counted by the database in your time zone. */
export async function fetchPageViewSeries(days = 15): Promise<PageViewPoint[]> {
  if (supabase) {
    const { data, error } = await supabase.rpc("page_view_stats", { p_days: days, p_tz: timeZone });
    if (!error && Array.isArray(data)) return data.map((row: { day: string; views: number }) => ({ date: String(row.day), count: Number(row.views) || 0, label: label(String(row.day)) }));
    // Surface the failure instead of drawing an empty chart that reads as "no visits".
    throw error || new Error("No se pudieron leer las visitas.");
  }
  const counts = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) { const date = new Date(); date.setDate(date.getDate() - index); counts.set(localDay(date), 0); }
  readLocalViews().forEach((view) => { const key = localDay(new Date(view.viewedAt)); if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1); });
  return [...counts.entries()].map(([date, count]) => ({ date, count, label: label(date) }));
}

export async function fetchTodayPageViewCount() {
  const series = await fetchPageViewSeries(1);
  return series[series.length - 1]?.count || 0;
}

/** Views, unique visitors and today's views for the last `days` days. `visitors` is null when the database cannot count them yet. */
export async function fetchPageViewSummary(days = 30): Promise<PageViewSummary> {
  if (supabase) {
    const { data, error } = await supabase.rpc("page_view_summary", { p_days: days, p_tz: timeZone });
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row) return { views: Number(row.views) || 0, visitors: Number(row.visitors) || 0, untrackedViews: Number(row.untracked_views) || 0, todayViews: Number(row.today_views) || 0 };
    if (!isMissingFunction(error)) throw error || new Error("No se pudo leer el resumen de visitas.");
    // Database without the visitors migration: totals from the daily series, visitors unknown.
    const series = await fetchPageViewSeries(days);
    const views = series.reduce((total, point) => total + point.count, 0);
    return { views, visitors: null, untrackedViews: views, todayViews: series[series.length - 1]?.count || 0 };
  }
  const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - (Math.max(days, 1) - 1));
  const today = localDay(new Date());
  const views = readLocalViews().filter((view) => new Date(view.viewedAt) >= from);
  const identified = views.filter((view) => view.visitorId);
  return { views: views.length, visitors: new Set(identified.map((view) => view.visitorId)).size, untrackedViews: views.length - identified.length, todayViews: views.filter((view) => localDay(new Date(view.viewedAt)) === today).length };
}
