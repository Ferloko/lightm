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
    const { error } = await supabase.from("page_views").insert({ path });
    if (!error) return;
    console.warn("[LIGHT] Page view tracking unavailable; using local fallback", error.message);
  }
  const views = readLocalViews();
  localStorage.setItem(LOCAL_KEY, JSON.stringify([...views.slice(-4999), { path, viewedAt: new Date().toISOString() }]));
}

export async function fetchTodayPageViewCount() {
  const today = new Date().toISOString().slice(0, 10);
  if (supabase) {
    const { count, error } = await supabase.from("page_views").select("id", { count: "exact", head: true }).gte("viewed_at", `${today}T00:00:00.000Z`);
    if (!error && typeof count === "number") return count;
    console.warn("[LIGHT] Could not read page view count", error?.message);
  }
  return readLocalViews().filter((view) => view.viewedAt.slice(0, 10) === today).length;
}

export async function fetchPageViewSeries(days = 15): Promise<PageViewPoint[]> {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const counts = new Map<string, number>();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    counts.set(date.toISOString().slice(0, 10), 0);
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("page_views")
      .select("viewed_at")
      .gte("viewed_at", `${start.toISOString().slice(0, 10)}T00:00:00.000Z`)
      .order("viewed_at", { ascending: true })
      .range(0, 9999);
    if (!error && data) {
      data.forEach((row) => {
        const date = String(row.viewed_at).slice(0, 10);
        if (counts.has(date)) counts.set(date, (counts.get(date) || 0) + 1);
      });
    } else if (error) {
      console.warn("[LIGHT] Could not read page view series", error.message);
    }
  } else {
    readLocalViews().forEach((view) => {
      const date = view.viewedAt.slice(0, 10);
      if (counts.has(date)) counts.set(date, (counts.get(date) || 0) + 1);
    });
  }

  return [...counts.entries()].map(([date, count]) => ({
    date,
    count,
    label: new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(".", ""),
  }));
}
