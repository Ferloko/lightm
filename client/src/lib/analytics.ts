import { supabase } from "@/lib/supabase";

const LOCAL_KEY = "light_page_views";

type LocalView = { path: string; viewedAt: string };
export type PageViewPoint = { date: string; label: string; count: number };

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
  if (supabase) {
    const { error } = await supabase.from("page_views").insert({ path: path.slice(0, 300) });
    if (error) console.warn("[LIGHT] Page view tracking unavailable", error.message);
    return;
  }
  const views = readLocalViews();
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify([...views.slice(-4999), { path, viewedAt: new Date().toISOString() }])); } catch { /* demo only */ }
}

const timeZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
function localDay(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function label(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(".", ""); }

/** Daily views for the last `days` days, counted by the database in your time zone. */
export async function fetchPageViewSeries(days = 15): Promise<PageViewPoint[]> {
  if (supabase) {
    const { data, error } = await supabase.rpc("page_view_stats", { p_days: days, p_tz: timeZone });
    if (!error && Array.isArray(data)) return data.map((row: { day: string; views: number }) => ({ date: String(row.day), count: Number(row.views) || 0, label: label(String(row.day)) }));
    console.warn("[LIGHT] Could not read page view stats", error?.message);
    return [];
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
