import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getVisitorId } from "@/lib/analytics";

/**
 * Estadísticas por artículo. Los eventos son anónimos (identificador aleatorio por navegador)
 * y se envían en lotes a public.article_events; el Dashboard los lee con article_stats().
 */
export type ArticleEvent = "impression" | "click" | "read_50" | "read_100" | "share" | "time";

/** Dónde estaba la tarjeta del artículo cuando se vio o se pulsó. */
export const SOURCE_LABELS: Record<string, string> = {
  home_hero: "Portada · Hero",
  home_feature: "Portada · Feature",
  home_selection: "Portada · Selección",
  home: "Portada · otros",
  archive_spotlight: "Archivo · Spotlight",
  archive_mustreads: "Archivo · Must-Reads",
  archive_latest: "Archivo · Latest issue",
  archive: "Archivo · otros",
  section: "Secciones",
  search: "Buscador",
  menu: "Menú",
  article: "Otro artículo",
  other: "Otros",
};

type QueuedEvent = { article_key: string; event: ArticleEvent; source: string | null; value: number | null; visitor_id: string | null; created_at: string };
const DEMO_KEY = "light.demo.article-events";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

let queue: QueuedEvent[] = [];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validVisitorId = () => { const id = getVisitorId(); return id && UUID.test(id) ? id : null; };
let timer: number | undefined;

/** Clave del artículo a partir de su ruta: slug (o id) en minúsculas. */
export function articleKeyFromPath(pathname: string): string | null {
  const match = /^\/historias\/([^/?#]+)/i.exec(pathname);
  if (!match) return null;
  try { return decodeURIComponent(match[1]).toLowerCase(); } catch { return match[1].toLowerCase(); }
}

function flush(useBeacon = false) {
  if (timer) { window.clearTimeout(timer); timer = undefined; }
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  if (!supabase || !supabaseUrl || !supabaseKey) {
    try { const saved = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); localStorage.setItem(DEMO_KEY, JSON.stringify([...(Array.isArray(saved) ? saved : []), ...batch].slice(-5000))); } catch { /* demo only */ }
    return;
  }
  // keepalive lets the last batch (time on page, read depth) arrive even when the tab is closing.
  void fetch(`${supabaseUrl}/rest/v1/article_events`, {
    method: "POST",
    keepalive: useBeacon,
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    // created_at lo pone la base de datos; el reloj del navegador no es fiable.
    body: JSON.stringify(batch.map(({ created_at: _createdAt, ...item }) => item)),
  }).catch(() => undefined);
}

export function trackArticleEvent(articleKey: string, event: ArticleEvent, options: { source?: string; value?: number } = {}) {
  const key = articleKey.trim().toLowerCase().slice(0, 200);
  if (!key || typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin")) return; // el Dashboard no cuenta como lectura
  const value = options.value === undefined ? null : Math.max(0, Math.min(3600, Math.round(options.value)));
  queue.push({ article_key: key, event, source: options.source?.slice(0, 40) || null, value, visitor_id: validVisitorId(), created_at: new Date().toISOString() });
  if (queue.length >= 25) flush();
  else if (!timer) timer = window.setTimeout(() => flush(), 4000);
}

if (typeof window !== "undefined") {
  const flushNow = () => flush(true);
  window.addEventListener("pagehide", flushNow);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushNow(); });
}

/** Origen de una tarjeta según el bloque de la página en el que está. */
export function sourceForElement(element: Element): string {
  const explicit = element.closest<HTMLElement>("[data-article-source]")?.dataset.articleSource;
  if (explicit) return explicit;
  if (element.closest(".menu-overlay, .site-menu-overlay")) return "menu";
  if (element.closest(".site-search, .search-overlay, [data-search-dialog]")) return "search";
  if (element.closest(".hero-section")) return "home_hero";
  if (element.closest(".feature-grid")) return "home_feature";
  if (element.closest("#seleccion")) return "home_selection";
  if (element.closest(".archive-spotlight")) return "archive_spotlight";
  if (element.closest(".archive-mustreads")) return "archive_mustreads";
  if (element.closest(".archive-latest-grid")) return "archive_latest";
  const path = window.location.pathname.toLowerCase();
  if (path === "/") return "home";
  if (path.startsWith("/archivo")) return "archive";
  if (path.startsWith("/historias/")) return "article";
  if (/^\/(moda|belleza|eventos|sociedad|living)(\/|$)/.test(path)) return "section";
  return "other";
}

/**
 * Rastreador global: cuenta una impresión cuando una tarjeta que enlaza a un artículo está
 * visible al menos un 50 % durante medio segundo, y un clic cuando se pulsa. Funciona con
 * cualquier enlace a /historias/… sin tocar cada tarjeta. Una impresión por artículo y
 * origen en cada página vista.
 */
export function startArticleTracking(): () => void {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return () => undefined;
  let seen = new Set<string>();
  let lastPath = window.location.pathname;
  const timers = new Map<Element, number>();
  const observed = new WeakSet<Element>();

  const linkInfo = (element: Element) => {
    const href = element.getAttribute("href") || "";
    let url: URL;
    try { url = new URL(href, window.location.origin); } catch { return null; }
    if (url.origin !== window.location.origin) return null;
    const key = articleKeyFromPath(url.pathname);
    if (!key || key === articleKeyFromPath(window.location.pathname)) return null; // no contar el propio artículo
    return { key, source: sourceForElement(element) };
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const element = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (timers.has(element)) return;
        timers.set(element, window.setTimeout(() => {
          timers.delete(element);
          const info = linkInfo(element);
          if (!info) return;
          const id = `${info.key}|${info.source}`;
          if (seen.has(id)) return;
          seen.add(id);
          trackArticleEvent(info.key, "impression", { source: info.source });
        }, 500));
      } else {
        const pending = timers.get(element);
        if (pending) { window.clearTimeout(pending); timers.delete(element); }
      }
    });
  }, { threshold: [0, 0.5] });

  const scan = () => {
    if (window.location.pathname !== lastPath) { lastPath = window.location.pathname; seen = new Set(); }
    document.querySelectorAll('a[href*="/historias/"]').forEach((element) => {
      if (observed.has(element)) return;
      observed.add(element);
      observer.observe(element);
    });
  };

  const onClick = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest?.('a[href*="/historias/"]');
    if (!link) return;
    const info = linkInfo(link);
    if (info) trackArticleEvent(info.key, "click", { source: info.source });
  };

  scan();
  const mutations = new MutationObserver(() => scan());
  mutations.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", onClick, true);
  return () => { observer.disconnect(); mutations.disconnect(); document.removeEventListener("click", onClick, true); timers.forEach((id) => window.clearTimeout(id)); };
}

/** Profundidad de lectura (50 % y final) y tiempo activo en la página de un artículo. */
export function useArticleReadTracking(articleKey: string | null, bodySelector = ".public-article-paper") {
  useEffect(() => {
    if (!articleKey) return;
    const key = articleKey.toLowerCase();
    const reached = new Set<string>();
    let activeSince = document.visibilityState === "visible" ? Date.now() : 0;
    let pendingSeconds = 0;
    const openedAt = Date.now();

    const check = () => {
      // Al menos 5 s en la página: abrir y cerrar no cuenta como lectura.
      if (Date.now() - openedAt < 5000) return;
      const body = document.querySelector(bodySelector);
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.4;
      const progress = total > 0 ? (window.innerHeight * 0.6 - rect.top) / total : 1;
      if (progress >= 0.5 && !reached.has("read_50")) { reached.add("read_50"); trackArticleEvent(key, "read_50"); }
      if (progress >= 0.97 && !reached.has("read_100")) { reached.add("read_100"); trackArticleEvent(key, "read_100"); }
    };
    const stopClock = () => { if (activeSince) { pendingSeconds += (Date.now() - activeSince) / 1000; activeSince = 0; } };
    // Se envía al momento (keepalive): al cerrar la pestaña no habría otra ocasión.
    const sendTime = () => { stopClock(); if (pendingSeconds >= 1) { trackArticleEvent(key, "time", { value: Math.min(pendingSeconds, 3600) }); flush(true); } pendingSeconds = 0; };
    const onVisibility = () => { if (document.visibilityState === "hidden") sendTime(); else if (!activeSince) activeSince = Date.now(); };

    const ticker = window.setInterval(check, 1000);
    window.addEventListener("scroll", check, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", sendTime);
    check();
    return () => {
      window.clearInterval(ticker);
      window.removeEventListener("scroll", check);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", sendTime);
      sendTime();
    };
  }, [articleKey, bodySelector]);
}

export type ArticleStats = {
  articleId: string;
  impressions: number;
  clicks: number;
  views: number;
  visitors: number;
  reads50: number;
  reads100: number;
  avgSeconds: number;
  shares: number;
  likes: number;
  clickSources: Record<string, number>;
};

export type ArticleStatsResult = { status: "ok"; stats: Record<string, ArticleStats> } | { status: "not_configured" } | { status: "error"; message: string };

const emptyStats = (articleId: string): ArticleStats => ({ articleId, impressions: 0, clicks: 0, views: 0, visitors: 0, reads50: 0, reads100: 0, avgSeconds: 0, shares: 0, likes: 0, clickSources: {} });

/** Demo local: calcula lo mismo que article_stats() con los datos guardados en este navegador. */
function demoStats(articles: { id: string; slug: string }[], days: number): Record<string, ArticleStats> {
  const from = Date.now() - days * 86400000;
  let events: QueuedEvent[] = [];
  let views: { path: string; viewedAt: string; visitorId?: string }[] = [];
  try { events = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); } catch { /* empty */ }
  try { views = JSON.parse(localStorage.getItem("light_page_views") || "[]"); } catch { /* empty */ }
  const result: Record<string, ArticleStats> = {};
  articles.forEach((article) => {
    const keys = new Set([article.slug?.toLowerCase(), article.id.toLowerCase()].filter(Boolean) as string[]);
    const stats = emptyStats(article.id);
    let seconds = 0;
    events.filter((item) => keys.has(item.article_key) && Date.parse(item.created_at) >= from).forEach((item) => {
      if (item.event === "impression") stats.impressions += 1;
      if (item.event === "click") { stats.clicks += 1; const source = item.source || "other"; stats.clickSources[source] = (stats.clickSources[source] || 0) + 1; }
      if (item.event === "read_50") stats.reads50 += 1;
      if (item.event === "read_100") stats.reads100 += 1;
      if (item.event === "share") stats.shares += 1;
      if (item.event === "time") seconds += item.value || 0;
    });
    const articleViews = views.filter((view) => Date.parse(view.viewedAt) >= from && keys.has(articleKeyFromPath(view.path) || ""));
    stats.views = articleViews.length;
    stats.visitors = new Set(articleViews.map((view) => view.visitorId).filter(Boolean)).size;
    stats.avgSeconds = stats.views ? Math.round(seconds / stats.views) : 0;
    result[article.id] = stats;
  });
  return result;
}

export async function fetchArticleStats(articles: { id: string; slug: string }[], days = 30): Promise<ArticleStatsResult> {
  if (!supabase) return { status: "ok", stats: demoStats(articles, days) };
  const { data, error } = await supabase.rpc("article_stats", { p_days: days });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message)) return { status: "not_configured" };
    return { status: "error", message: error.message };
  }
  const stats: Record<string, ArticleStats> = {};
  (data || []).forEach((row: Record<string, unknown>) => {
    const id = String(row.article_id);
    stats[id] = { articleId: id, impressions: Number(row.impressions) || 0, clicks: Number(row.clicks) || 0, views: Number(row.views) || 0, visitors: Number(row.visitors) || 0, reads50: Number(row.reads_50) || 0, reads100: Number(row.reads_100) || 0, avgSeconds: Number(row.avg_seconds) || 0, shares: Number(row.shares) || 0, likes: Number(row.likes) || 0, clickSources: (row.click_sources as Record<string, number>) || {} };
  });
  return { status: "ok", stats };
}

export function useArticleStats(articles: { id: string; slug: string }[], days: number, enabled: boolean) {
  const [result, setResult] = useState<ArticleStatsResult | null>(null);
  const signature = articles.map((article) => `${article.id}:${article.slug}`).join(",");
  useEffect(() => {
    if (!enabled) { setResult(null); return; }
    let active = true;
    void fetchArticleStats(articles, days).then((value) => { if (active) setResult(value); });
    return () => { active = false; };
  }, [signature, days, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return result;
}

/** Porcentaje legible (o "—" si no hay base). */
export function rate(part: number, total: number) { return total > 0 ? `${Math.round((part / total) * 100)} %` : "—"; }
export function formatDuration(seconds: number) { if (!seconds) return "—"; const m = Math.floor(seconds / 60); const s = Math.round(seconds % 60); return m ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`; }
