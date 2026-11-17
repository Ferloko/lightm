import { ArrowUpRight, Plus } from "lucide-react";
import UtcTime from "@/components/UtcTime";
import FacebrowserPanel from "@/components/FacebrowserPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { fetchPageViewSeries, fetchPageViewSummary, type PageViewPoint, type PageViewSummary } from "@/lib/analytics";
import { addDaysKey, CAMPAIGN_CHANNELS, campaignOverlaps, prorateCampaign, campaignStatus, campaignStatusLabel, sortCampaigns, summarizeCampaigns, todayKey, type Campaign, type CampaignChannel } from "@/lib/campaigns";
import { utcTodayKey, type CalendarEvent } from "@/lib/calendar";
import type { EditorialArticle } from "@/lib/editorial";
import { useArticleStats } from "@/lib/articleAnalytics";
import type { NewsletterSubscriber } from "@/lib/newsletter";

const RANGE_KEY = "light.dashboard.range";
const CHANNEL_KEY = "light.dashboard.channel";
const ranges = [7, 30, 90] as const;
type Range = typeof ranges[number];
type ChannelFilter = CampaignChannel | "all";

const PRORATE_NOTE = "estimado según los días de cada campaña dentro del periodo";
const integer = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);
const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);
const formatMoney = (value: number) => `$${money.format(value)}`;
const formatCompact = (value: number) => value >= 10000 ? compact.format(value) : integer.format(value);
const percent = (value: number | null, digits = 1) => value === null ? "—" : `${(value * 100).toLocaleString("es-ES", { maximumFractionDigits: digits })}%`;
function readStored<T>(key: string, allowed: readonly T[], fallback: T): T { try { const raw = localStorage.getItem(key); const value = (raw && /^\d+$/.test(raw) ? Number(raw) : raw) as T; return allowed.includes(value) ? value : fallback; } catch { return fallback; } }
function store(key: string, value: string | number) { try { localStorage.setItem(key, String(value)); } catch { /* per-viewer convenience only */ } }
function formatScheduleDate(value: string) { return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(".", ""); }
function relativeTime(iso: string) {
  const time = new Date(iso).getTime(); if (!Number.isFinite(time)) return "";
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return "Ahora mismo"; if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60); if (hours < 24) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.round(hours / 24); if (days < 30) return `Hace ${days} ${days === 1 ? "día" : "días"}`;
  return new Date(time).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export type OverviewTarget = "campaigns" | "subscribers" | "calendar" | "pages";

type Props = {
  articles: EditorialArticle[];
  subscriberCount: number;
  subscribers: NewsletterSubscriber[];
  campaigns: Campaign[];
  calendarEvents: CalendarEvent[];
  canOpen: (target: OverviewTarget) => boolean;
  onNavigate: (target: OverviewTarget) => void;
  onOpenCampaign: (campaign: Campaign | null) => void;
  onOpenArticle: (article: EditorialArticle) => void;
  onNew: () => void;
  /** Owner/Admin: pueden escribir las cifras de Redes de LIGHT. */
  canEditSocial?: boolean;
  editorName?: string;
};

type Kpi = { key: string; label: string; value: string; note: React.ReactNode; hint: string; tone?: "accent" | "newsletter"; onClick?: () => void };
type ActivityKind = "articles" | "campaigns" | "subscribers" | "calendar";
type Activity = { id: string; kind: ActivityKind; at: string; icon: string; tone: "acid" | "blue" | "soft"; title: string; text: string; meta: string; onClick?: () => void };

export default function PerformanceOverview({ articles, subscriberCount, subscribers, campaigns, calendarEvents, canOpen, onNavigate, onOpenCampaign, onOpenArticle, onNew, canEditSocial = false, editorName = "" }: Props) {
  const [range, setRange] = useState<Range>(() => readStored<Range>(RANGE_KEY, ranges, 30));
  const [channel, setChannel] = useState<ChannelFilter>(() => readStored<ChannelFilter>(CHANNEL_KEY, ["all", ...CAMPAIGN_CHANNELS.map((item) => item.id)], "all"));
  const [summary, setSummary] = useState<PageViewSummary | null>(null);
  const [series, setSeries] = useState<PageViewPoint[]>([]);
  const [analyticsError, setAnalyticsError] = useState(false);
  const trafficRef = useRef<HTMLElement>(null);
  const articlesRef = useRef<HTMLElement>(null);
  const [showAllArticles, setShowAllArticles] = useState(false);
  // Impresiones, clics y visitas de cada artículo: se registran solos en la web (article_stats).
  const published = useMemo(() => articles.filter((article) => article.status === "published"), [articles]);
  const { result: articleStats, loading: articleStatsLoading } = useArticleStats(published, range, published.length > 0);

  useEffect(() => {
    let active = true;
    const chartDays = Math.min(range, 30);
    setAnalyticsError(false);
    Promise.all([fetchPageViewSummary(range), fetchPageViewSeries(chartDays)])
      .then(([nextSummary, nextSeries]) => { if (active) { setSummary(nextSummary); setSeries(nextSeries); } })
      .catch((error) => { console.warn("[LIGHT] Overview analytics", error); if (active) { setSummary(null); setSeries([]); setAnalyticsError(true); } });
    return () => { active = false; };
  }, [range]);

  const today = todayKey();
  const from = addDaysKey(today, -(range - 1));
  const matchesChannel = (campaign: Campaign) => channel === "all" || campaign.channel === channel;
  const periodCampaigns = useMemo(() => campaigns.filter((campaign) => campaignOverlaps(campaign, from, today) && (channel === "all" || campaign.channel === channel)).map((campaign) => prorateCampaign(campaign, from, today)), [campaigns, from, today, channel]);
  const totals = useMemo(() => summarizeCampaigns(periodCampaigns), [periodCampaigns]);
  const channelTotals = useMemo(() => summarizeCampaigns(campaigns.filter((campaign) => campaignOverlaps(campaign, from, today)).map((campaign) => prorateCampaign(campaign, from, today))), [campaigns, from, today]);
  const newSubscribers = subscribers.filter((subscriber) => subscriber.subscribedAt.slice(0, 10) >= from).length;
  const countsSubscribers = channel === "all" || channel === "email";
  const conversions = totals.conversions + (countsSubscribers ? newSubscribers : 0);
  const hasMetrics = totals.spend + totals.impressions + totals.revenue + totals.budget > 0;
  const periodLabel = `últimos ${range} días`;
  const campaignsAction = canOpen("campaigns") ? () => onNavigate("campaigns") : undefined;
  const scrollToTraffic = () => trafficRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const emptyNote = (text: string) => hasMetrics ? text : canOpen("campaigns") ? "Registra métricas en Campañas" : "Sin métricas en el periodo";

  const articleRows = useMemo(() => {
    if (articleStats?.status !== "ok") return [];
    return published.map((article) => { const stats = articleStats.stats[article.id]; const impressions = stats?.impressions || 0, clicks = stats?.clicks || 0, views = stats?.views || 0; return { article, impressions, clicks, views, ctr: impressions ? clicks / impressions : null }; })
      .sort((a, b) => b.impressions - a.impressions || b.views - a.views || b.clicks - a.clicks);
  }, [articleStats, published]);
  const articleTotals = articleRows.reduce((total, row) => ({ impressions: total.impressions + row.impressions, clicks: total.clicks + row.clicks, views: total.views + row.views }), { impressions: 0, clicks: 0, views: 0 });
  const articleCtr = articleTotals.impressions ? articleTotals.clicks / articleTotals.impressions : null;
  const maxArticleImpressions = Math.max(0, ...articleRows.map((row) => row.impressions));
  const scrollToArticles = () => articlesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const statsPending = !articleStats && published.length > 0;

  const kpis: Kpi[] = [
    { key: "visits", label: "Visitas hoy", value: analyticsError ? "—" : summary ? integer.format(summary.todayViews) : "…", note: analyticsError ? "No se pudieron cargar las visitas" : <><b>{summary ? integer.format(summary.views) : "…"}</b> en {periodLabel}</>, hint: "Ver la evolución diaria de visitas", tone: "accent", onClick: scrollToTraffic },
    { key: "spend", label: "Ad spend", value: formatMoney(totals.spend), note: totals.budget ? <><b>{percent(totals.spend / totals.budget, 0)}</b> de {formatMoney(totals.budget)} presupuesto</> : emptyNote(`${totals.count} campañas en el periodo`), hint: `${"Inversión registrada en las campañas del periodo"} · ${PRORATE_NOTE}`, onClick: campaignsAction },
    { key: "ctr", label: "CTR", value: statsPending ? "…" : percent(articleCtr, 2), note: articleStats?.status === "ok" ? <><b>{integer.format(articleTotals.clicks)}</b> clics / {formatCompact(articleTotals.impressions)} impresiones</> : statsPending ? "Calculando…" : "Sin datos de artículos", hint: "Clics ÷ impresiones de los artículos en el periodo (se calculan solos en la web)", onClick: scrollToArticles },
    { key: "roas", label: "ROAS", value: totals.roas === null ? "—" : `${totals.roas.toLocaleString("es-ES", { maximumFractionDigits: 2 })}×`, note: <><b>{formatMoney(totals.revenue)}</b> / {formatMoney(totals.spend)} invertidos</>, hint: `${"Ingresos ÷ inversión"} · ${PRORATE_NOTE}`, onClick: campaignsAction },
    { key: "revenue", label: "Revenue", value: formatMoney(totals.revenue), note: totals.spend ? <><b>{formatMoney(totals.revenue - totals.spend)}</b> margen sobre inversión</> : emptyNote("Ingresos atribuidos"), hint: `${"Ingresos atribuidos a campañas"} · ${PRORATE_NOTE}`, onClick: campaignsAction },
    { key: "users", label: "Active users", value: analyticsError ? "—" : !summary ? "…" : summary.visitors === null || (summary.visitors === 0 && summary.untrackedViews > 0) ? "—" : integer.format(summary.visitors), note: analyticsError ? "No se pudieron cargar las visitas" : summary?.visitors === null ? "Requiere la migración de visitantes" : summary && summary.untrackedViews > 0 ? <><b>{integer.format(summary.untrackedViews)}</b> visitas anteriores sin identificar</> : <><b>Únicos</b> en {periodLabel}</>, hint: "Navegadores distintos que visitaron LIGHT", onClick: scrollToTraffic },
    { key: "conversions", label: "Conversions", value: integer.format(conversions), note: <><b>{integer.format(totals.conversions)}</b> campañas{countsSubscribers ? ` · ${integer.format(newSubscribers)} suscripciones` : ""}</>, hint: `${"Conversiones de campañas + nuevas suscripciones"} · ${PRORATE_NOTE}`, onClick: campaignsAction || (canOpen("subscribers") ? () => onNavigate("subscribers") : undefined) },
    { key: "subscribers", label: "Suscriptores", value: integer.format(subscriberCount), note: <><b>+{integer.format(newSubscribers)}</b> en {periodLabel}</>, hint: "Abrir la lista de suscriptores", tone: "newsletter", onClick: canOpen("subscribers") ? () => onNavigate("subscribers") : undefined },
  ];

  const budgetTotal = channelTotals.budget;
  const donutColors: Record<CampaignChannel, string> = { social: "var(--acid)", search: "#58708a", email: "#c9c2b8", other: "#8f8a80" };

  const visibleCampaigns = sortCampaigns(campaigns.filter((campaign) => campaign.endDate >= today && matchesChannel(campaign)));
  const upcomingEvents = calendarEvents.filter((event) => event.startAt.slice(0, 10) >= utcTodayKey()).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 4);

  const activity: Activity[] = [
    ...articles.map((article): Activity => {
      const isPublished = article.status === "published";
      const edited = isPublished && article.publishedAt && article.updatedAt && new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > 60000;
      return { id: `article-${article.id}`, kind: "articles", at: edited ? article.updatedAt : (isPublished && article.publishedAt) || article.updatedAt, icon: isPublished ? (edited ? "✎" : "↗") : "✎", tone: isPublished ? "acid" : "blue", title: article.title || "Sin título",
        text: isPublished ? (edited ? "se editó (ya publicada)" : "se publicó") : "se guardó como borrador",
        meta: [article.category || "Página", `por ${article.author || "LIGHT"}`, isPublished ? (article.isVisible === false ? "oculta" : article.isFeatured ? "destacada" : "visible") : "", article.readingTime].filter(Boolean).join(" · "), onClick: () => onOpenArticle(article) };
    }),
    ...campaigns.filter((campaign) => campaign.createdAt).map((campaign): Activity => ({ id: `campaign-${campaign.id}`, kind: "campaigns", at: campaign.createdAt as string, icon: "◎", tone: "soft", title: campaign.name, text: `campaña creada · ${campaignStatusLabel[campaignStatus(campaign)].toLowerCase()}`, meta: [`${formatScheduleDate(campaign.startDate)} — ${formatScheduleDate(campaign.endDate)}`, CAMPAIGN_CHANNELS.find((item) => item.id === campaign.channel)?.label || "", campaign.budget ? `presupuesto ${formatMoney(campaign.budget)}` : ""].filter(Boolean).join(" · "), onClick: canOpen("campaigns") ? () => onOpenCampaign(campaign) : undefined })),
    ...subscribers.slice(0, 60).map((subscriber): Activity => ({ id: `subscriber-${subscriber.id}`, kind: "subscribers", at: subscriber.subscribedAt, icon: "+", tone: "soft", title: "Nueva suscripción", text: "a Correspondencia LIGHT", meta: `Formulario: ${subscriber.source || "web"}`, onClick: canOpen("subscribers") ? () => onNavigate("subscribers") : undefined })),
    ...calendarEvents.filter((event) => event.startAt).map((event): Activity => ({ id: `event-${event.id}`, kind: "calendar", at: `${event.startAt.slice(0, 10) >= utcTodayKey() ? "0000" : event.startAt.slice(0, 16)}`, icon: "◷", tone: "blue", title: event.title || "Evento", text: event.startAt.slice(0, 10) >= utcTodayKey() ? "en el calendario" : "pasó por el calendario", meta: `${formatScheduleDate(event.startAt)}${event.allDay ? " · todo el día" : ` · ${event.startAt.slice(11, 16)} UTC`}${event.endAt && event.endAt.slice(0, 10) !== event.startAt.slice(0, 10) ? ` → ${formatScheduleDate(event.endAt)}` : ""}`, onClick: canOpen("calendar") ? () => onNavigate("calendar") : undefined })).filter((item) => item.at !== "0000"),
  ].filter((item) => item.at && Number.isFinite(new Date(item.at).getTime())).sort((a, b) => b.at.localeCompare(a.at));

  return <section className="performance-dashboard">
    <div className="performance-heading">
      <div><p className="eyebrow">LIGHT / Performance studio</p><h1>Lo que está pasando.</h1><p className="performance-heading__dek">Una lectura rápida del alcance, la conversión y el rendimiento de tu edición.</p></div>
      <div className="performance-heading__actions">
        <label className="performance-select"><span className="sr-only">Periodo</span><select value={range} onChange={(event) => { const value = Number(event.target.value) as Range; setRange(value); store(RANGE_KEY, value); }}>{ranges.map((value) => <option key={value} value={value}>Últimos {value} días</option>)}</select></label>
        <label className="performance-select"><span className="sr-only">Canal</span><select value={channel} onChange={(event) => { const value = event.target.value as ChannelFilter; setChannel(value); store(CHANNEL_KEY, value); }}><option value="all">Todos los canales</option>{CAMPAIGN_CHANNELS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
    </div>

    <div className="performance-kpis">
      {kpis.map((kpi) => <button type="button" key={kpi.key} className={`performance-kpi${kpi.tone ? ` performance-kpi--${kpi.tone}` : ""}`} onClick={kpi.onClick} disabled={!kpi.onClick} title={kpi.hint}><span>{kpi.label}</span><strong>{kpi.value}</strong><small>{kpi.note}</small>{kpi.onClick && <i>↗</i>}</button>)}
    </div>
    {hasMetrics && <p className="performance-footnote">Las métricas de campaña se reparten por días: el periodo solo suma la parte de cada campaña que cae dentro de él.</p>}

    <article className="performance-panel performance-panel--traffic" ref={trafficRef}><div className="performance-panel__head"><div><p className="eyebrow">Audiencia LIGHT</p><h2>Visitas de los últimos {series.length || Math.min(range, 30)} días.</h2></div><span className="performance-panel__metric">{integer.format(series.reduce((total, point) => total + point.count, 0))} <small>visitas</small></span></div>{analyticsError && <p className="campaign-table__empty" role="alert">No se pudieron cargar las visitas. Recarga la página para intentarlo de nuevo.</p>}<TrafficChart series={series} /></article>

    <FacebrowserPanel canEdit={canEditSocial} editorName={editorName} />
    <div className="performance-grid performance-grid--charts">
      <article className={`performance-panel performance-panel--chart performance-panel--articles${articleStatsLoading ? " is-loading" : ""}`} ref={articlesRef}><div className="performance-panel__head"><div><p className="eyebrow">Artículos · {periodLabel}</p><h2>Rendimiento por artículo.</h2></div><span className="performance-panel__metric">{formatCompact(articleTotals.impressions)} <small>impresiones</small></span></div>
        {articleStats?.status === "not_configured" ? <PanelEmpty text="Las estadísticas de artículos necesitan la migración de analítica en Supabase." label="" />
          : articleStats?.status === "error" ? <PanelEmpty text={`No se pudieron cargar las estadísticas: ${articleStats.message}`} label="" />
          : !published.length ? <PanelEmpty text="Aún no hay artículos publicados." action={onNew} label="Crear página" />
          : statsPending ? <p className="article-perf__loading">Calculando…</p>
          : <div className="article-perf" role="table" aria-label="Rendimiento por artículo">
            <div className="article-perf__row article-perf__row--head" role="row"><span role="columnheader">Artículo</span><span role="columnheader">Clics</span><span role="columnheader">Impresiones</span><span role="columnheader">Visitas</span><span role="columnheader">CTR</span></div>
            {(showAllArticles ? articleRows : articleRows.slice(0, 6)).map((row) => <button type="button" role="row" className="article-perf__row" key={row.article.id} onClick={() => onOpenArticle(row.article)} title={`${row.article.title} · abrir`}>
              <span className="article-perf__title" role="cell"><strong>{row.article.title || "Sin título"}</strong><small>{row.article.category}</small><i style={{ width: `${maxArticleImpressions ? (row.impressions / maxArticleImpressions) * 100 : 0}%` }} /></span>
              <span role="cell">{integer.format(row.clicks)}</span><span role="cell">{integer.format(row.impressions)}</span><span role="cell">{integer.format(row.views)}</span><span role="cell">{percent(row.ctr, 1)}</span>
            </button>)}
            <div className="article-perf__row article-perf__row--total" role="row"><span role="cell">Total · {articleRows.length} {articleRows.length === 1 ? "artículo" : "artículos"}</span><span role="cell">{integer.format(articleTotals.clicks)}</span><span role="cell">{integer.format(articleTotals.impressions)}</span><span role="cell">{integer.format(articleTotals.views)}</span><span role="cell">{percent(articleCtr, 1)}</span></div>
            {articleRows.length > 6 && <button type="button" className="performance-link article-perf__more" onClick={() => setShowAllArticles((value) => !value)}>{showAllArticles ? "Ver menos" : `Ver los ${articleRows.length}`}</button>}
            <p className="article-perf__note">Se calculan solos: una impresión es cada vez que el artículo aparece en pantalla; un clic, cada vez que alguien lo abre desde la web; las visitas, las veces que se lee su página.</p>
          </div>}
      </article>
      <article className="performance-panel performance-panel--allocation"><div className="performance-panel__head"><div><p className="eyebrow">Inversión</p><h2>Asignación de presupuesto.</h2></div><span className="performance-panel__metric">{formatMoney(budgetTotal)} <small>total</small></span></div>
        {budgetTotal ? <div className="donut-wrap"><BudgetDonut segments={CAMPAIGN_CHANNELS.filter((item) => channelTotals.byChannel[item.id].budget > 0).map((item) => ({ id: item.id, label: item.label, value: channelTotals.byChannel[item.id].budget, spend: channelTotals.byChannel[item.id].spend, color: donutColors[item.id] }))} total={budgetTotal} spent={channelTotals.spend} /></div>
          : <PanelEmpty text="Define el presupuesto de cada campaña para ver su reparto por canal." action={canOpen("campaigns") ? () => onNavigate("campaigns") : undefined} label="Ir a campañas" />}
      </article>
    </div>

    <div className="performance-grid performance-grid--lower">
      <article className="performance-panel performance-panel--table"><div className="performance-panel__head"><div><p className="eyebrow">Planificación editorial</p><h2>Comparativa de campañas.</h2></div>{canOpen("calendar") && <button className="performance-link" type="button" onClick={() => onNavigate("calendar")}>Ver calendario <ArrowUpRight size={14} /></button>}</div><div className="campaign-table"><div className="campaign-table__row campaign-table__row--head"><span>Campaña / evento</span><span>Estado</span><span>Inicio</span><span>Final</span><span>Canal · ROAS</span></div>{visibleCampaigns.map((campaign) => { const status = campaignStatus(campaign); return <button type="button" className="campaign-table__row" key={`campaign-${campaign.id}`} onClick={() => onOpenCampaign(campaign)} disabled={!canOpen("campaigns")}><strong>{campaign.name}</strong><span className={`campaign-status ${status === "active" ? "campaign-status--live" : "campaign-status--draft"}`}><i /> {campaignStatusLabel[status]}</span><span>{formatScheduleDate(campaign.startDate)}</span><span>{formatScheduleDate(campaign.endDate)}</span><span>{CAMPAIGN_CHANNELS.find((item) => item.id === campaign.channel)?.label} · {campaign.spend ? `${(campaign.revenue / campaign.spend).toLocaleString("es-ES", { maximumFractionDigits: 1 })}×` : "—"}</span></button>; })}{upcomingEvents.map((event) => <button type="button" className="campaign-table__row campaign-table__row--event" key={`event-${event.id}`} onClick={() => onNavigate("calendar")} disabled={!canOpen("calendar")}><strong>{event.title}</strong><span className="campaign-status campaign-status--paused"><i /> Por venir</span><span>{formatScheduleDate(event.startAt)}{!event.allDay && <> · <UtcTime value={event.startAt} showUtcBadge /></>}</span><span>{event.endAt ? formatScheduleDate(event.endAt) : "—"}</span><span>Evento</span></button>)}{!visibleCampaigns.length && !upcomingEvents.length && <div className="campaign-table__empty">No hay campañas ni eventos próximos.{canOpen("campaigns") && <button type="button" className="performance-link" onClick={() => onOpenCampaign(null)}><Plus size={13} /> Nueva campaña</button>}</div>}</div></article>
      <article className="performance-panel performance-panel--activity"><div className="performance-panel__head"><div><p className="eyebrow">Actividad reciente</p><h2>Últimos movimientos.</h2></div></div><ActivityFeed items={activity} /></article>
    </div>

    <div className="performance-footer-actions"><p>{visibleCampaigns.length} campañas y {upcomingEvents.length} eventos en la planificación visible.</p><div><button className="admin-secondary" onClick={() => onNavigate("pages")} type="button">Ver páginas <ArrowUpRight size={14} /></button><button className="admin-primary" onClick={onNew} type="button"><Plus size={14} /> Crear página</button></div></div>
  </section>;
}

function PanelEmpty({ text, action, label }: { text: string; action?: () => void; label: string }) {
  return <div className="performance-empty"><p>{text}</p>{action && <button type="button" className="performance-link" onClick={action}>{label} <ArrowUpRight size={14} /></button>}</div>;
}


const dayNames = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

/** Visitas diarias: las barras crecen al cargar; al pasar el ratón, cada día muestra sus visitas y su diferencia con la media. */
function TrafficChart({ series }: { series: PageViewPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(false); const frame = window.requestAnimationFrame(() => setReady(true)); return () => window.cancelAnimationFrame(frame); }, [series]);
  if (!series.length) return null;
  const max = Math.max(...series.map((item) => item.count), 1);
  const average = series.reduce((total, item) => total + item.count, 0) / series.length;
  const peak = series.reduce((best, item, index) => item.count > series[best].count ? index : best, 0);
  const active = hover !== null ? series[hover] : null;
  const diff = active ? active.count - average : 0;
  return <div className="traffic-wrap" onMouseLeave={() => setHover(null)}>
    <div className="traffic-readout" aria-live="polite">{active ? <><strong>{integer.format(active.count)}</strong><span>{active.count === 1 ? "visita" : "visitas"} · {dayNames.format(new Date(`${active.date}T12:00:00`))}</span><em className={diff >= 0 ? "is-up" : "is-down"}>{diff >= 0 ? "▲" : "▼"} {Math.abs(Math.round(diff)).toLocaleString("es-ES")} {diff >= 0 ? "sobre" : "bajo"} la media</em></>
      : <><strong>{Math.round(average).toLocaleString("es-ES")}</strong><span>visitas de media al día · pico el {dayNames.format(new Date(`${series[peak].date}T12:00:00`))} ({integer.format(series[peak].count)})</span><em>Pasa el ratón por las barras</em></>}</div>
    <div className={`traffic-chart${series.length > 15 ? " traffic-chart--dense" : ""}${ready ? " is-ready" : ""}${hover !== null ? " is-hovering" : ""}`} aria-label="Visitas diarias" style={{ "--avg": `${(average / max) * 100}%` } as CSSProperties}>
      {series.map((point, index) => <button type="button" className={`traffic-chart__bar${hover === index ? " is-active" : ""}${index === peak ? " is-peak" : ""}`} key={point.date} onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} aria-label={`${point.label}: ${point.count} visitas`} style={{ "--delay": `${index * 18}ms` } as CSSProperties}><span className="traffic-chart__plot"><i style={{ height: `${Math.max(5, (point.count / max) * 100)}%` }}><b>{integer.format(point.count)}</b></i></span><span>{point.label}</span></button>)}
    </div>
  </div>;
}

/** Donut de presupuesto en SVG: cada canal se resalta al pasar el ratón (también desde la leyenda). */
function BudgetDonut({ segments, total, spent }: { segments: { id: string; label: string; value: number; spend: number; color: string }[]; total: number; spent: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { const frame = window.requestAnimationFrame(() => setReady(true)); return () => window.cancelAnimationFrame(frame); }, []);
  const radius = 42, circumference = 2 * Math.PI * radius;
  let offset = 0;
  const active = segments.find((segment) => segment.id === hover) || null;
  return <>
    <div className={`budget-donut-svg${ready ? " is-ready" : ""}`} onMouseLeave={() => setHover(null)}>
      <svg viewBox="0 0 100 100" role="img" aria-label="Reparto del presupuesto por canal">
        <circle cx="50" cy="50" r={radius} className="budget-donut-svg__track" />
        {segments.map((segment) => { const length = (segment.value / total) * circumference; const dash = `${ready ? Math.max(0, length - 0.6) : 0} ${circumference}`; const node = <circle key={segment.id} cx="50" cy="50" r={radius} stroke={segment.color} strokeDasharray={dash} strokeDashoffset={-offset} className={hover && hover !== segment.id ? "is-dim" : hover === segment.id ? "is-active" : ""} onMouseEnter={() => setHover(segment.id)} />; offset += length; return node; })}
      </svg>
      <div className="budget-donut-svg__center">{active ? <><strong>{percent(active.value / total, 0)}</strong><span>{active.label}</span><small>{formatMoney(active.value)} · {percent(active.value ? active.spend / active.value : 0, 0)} invertido</small></> : <><strong>{percent(total ? spent / total : 0, 0)}</strong><span>invertido</span><small>{formatMoney(spent)} de {formatMoney(total)}</small></>}</div>
    </div>
    <div className="budget-legend">{segments.map((segment) => <button type="button" key={segment.id} className={hover === segment.id ? "is-active" : ""} onMouseEnter={() => setHover(segment.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(segment.id)} onBlur={() => setHover(null)}><i className="dot" style={{ background: segment.color }} /> {segment.label} <b>{formatMoney(segment.value)}</b><small>{percent(segment.value / total, 0)}</small></button>)}</div>
  </>;
}

const activityFilters: [ActivityKind | "all", string][] = [["all", "Todo"], ["articles", "Artículos"], ["campaigns", "Campañas"], ["subscribers", "Suscripciones"], ["calendar", "Calendario"]];
const exactTime = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Historial de movimientos: filtros por tipo y “Ver más” (antes se mostraban solo 5). */
function ActivityFeed({ items }: { items: Activity[] }) {
  const [filter, setFilter] = useState<ActivityKind | "all">("all");
  const [limit, setLimit] = useState(12);
  const filtered = filter === "all" ? items : items.filter((item) => item.kind === filter);
  const counts = useMemo(() => { const result: Record<string, number> = { all: items.length }; items.forEach((item) => { result[item.kind] = (result[item.kind] || 0) + 1; }); return result; }, [items]);
  return <>
    <div className="activity-filters" role="tablist" aria-label="Tipo de movimiento">{activityFilters.filter(([id]) => id === "all" || counts[id]).map(([id, label]) => <button type="button" role="tab" key={id} aria-selected={filter === id} className={filter === id ? "is-active" : ""} onClick={() => { setFilter(id); setLimit(12); }}>{label} <small>{counts[id] || 0}</small></button>)}</div>
    <div className="activity-list">{filtered.length ? filtered.slice(0, limit).map((item, index) => <button type="button" key={item.id} onClick={item.onClick} disabled={!item.onClick} style={{ "--delay": `${Math.min(index, 12) * 30}ms` } as CSSProperties}><span className={`activity-icon activity-icon--${item.tone}`}>{item.icon}</span><p><strong>{item.title}</strong> {item.text}<small title={exactTime(item.at)}>{relativeTime(item.at)} · {exactTime(item.at)}</small><small>{item.meta}</small></p></button>) : <p className="campaign-table__empty">Todavía no hay movimientos.</p>}</div>
    {filtered.length > limit && <button type="button" className="performance-link activity-more" onClick={() => setLimit((value) => value + 12)}>Ver más · quedan {filtered.length - limit}</button>}
  </>;
}
