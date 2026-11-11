import { ArrowUpRight, Plus } from "lucide-react";
import UtcTime from "@/components/UtcTime";
import FacebrowserPanel from "@/components/FacebrowserPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPageViewSeries, fetchPageViewSummary, type PageViewPoint, type PageViewSummary } from "@/lib/analytics";
import { addDaysKey, CAMPAIGN_CHANNELS, campaignOverlaps, prorateCampaign, campaignStatus, campaignStatusLabel, sortCampaigns, summarizeCampaigns, todayKey, type Campaign, type CampaignChannel } from "@/lib/campaigns";
import { utcTodayKey, type CalendarEvent } from "@/lib/calendar";
import type { EditorialArticle } from "@/lib/editorial";
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
};

type Kpi = { key: string; label: string; value: string; note: React.ReactNode; hint: string; tone?: "accent" | "newsletter"; onClick?: () => void };
type Activity = { id: string; at: string; icon: string; tone: "acid" | "blue" | "soft"; title: string; text: string; meta: string; onClick?: () => void };

export default function PerformanceOverview({ articles, subscriberCount, subscribers, campaigns, calendarEvents, canOpen, onNavigate, onOpenCampaign, onOpenArticle, onNew }: Props) {
  const [range, setRange] = useState<Range>(() => readStored<Range>(RANGE_KEY, ranges, 30));
  const [channel, setChannel] = useState<ChannelFilter>(() => readStored<ChannelFilter>(CHANNEL_KEY, ["all", ...CAMPAIGN_CHANNELS.map((item) => item.id)], "all"));
  const [summary, setSummary] = useState<PageViewSummary | null>(null);
  const [series, setSeries] = useState<PageViewPoint[]>([]);
  const [analyticsError, setAnalyticsError] = useState(false);
  const trafficRef = useRef<HTMLElement>(null);

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

  const kpis: Kpi[] = [
    { key: "visits", label: "Visitas hoy", value: analyticsError ? "—" : summary ? integer.format(summary.todayViews) : "…", note: analyticsError ? "No se pudieron cargar las visitas" : <><b>{summary ? integer.format(summary.views) : "…"}</b> en {periodLabel}</>, hint: "Ver la evolución diaria de visitas", tone: "accent", onClick: scrollToTraffic },
    { key: "spend", label: "Ad spend", value: formatMoney(totals.spend), note: totals.budget ? <><b>{percent(totals.spend / totals.budget, 0)}</b> de {formatMoney(totals.budget)} presupuesto</> : emptyNote(`${totals.count} campañas en el periodo`), hint: `${"Inversión registrada en las campañas del periodo"} · ${PRORATE_NOTE}`, onClick: campaignsAction },
    { key: "impressions", label: "Impressions", value: formatCompact(totals.impressions), note: <><b>{totals.count}</b> {emptyNote(totals.count === 1 ? "campaña en el periodo" : "campañas en el periodo")}</>, hint: `${"Impresiones registradas en las campañas"} · ${PRORATE_NOTE}`, onClick: campaignsAction },
    { key: "ctr", label: "CTR", value: percent(totals.ctr, 2), note: <><b>{integer.format(totals.clicks)}</b> clics / {formatCompact(totals.impressions)} impresiones</>, hint: `${"Clics ÷ impresiones"} · ${PRORATE_NOTE}`, onClick: campaignsAction },
    { key: "roas", label: "ROAS", value: totals.roas === null ? "—" : `${totals.roas.toLocaleString("es-ES", { maximumFractionDigits: 2 })}×`, note: <><b>{formatMoney(totals.revenue)}</b> / {formatMoney(totals.spend)} invertidos</>, hint: `${"Ingresos ÷ inversión"} · ${PRORATE_NOTE}`, onClick: campaignsAction },
    { key: "revenue", label: "Revenue", value: formatMoney(totals.revenue), note: totals.spend ? <><b>{formatMoney(totals.revenue - totals.spend)}</b> margen sobre inversión</> : emptyNote("Ingresos atribuidos"), hint: `${"Ingresos atribuidos a campañas"} · ${PRORATE_NOTE}`, onClick: campaignsAction },
    { key: "users", label: "Active users", value: analyticsError ? "—" : !summary ? "…" : summary.visitors === null || (summary.visitors === 0 && summary.untrackedViews > 0) ? "—" : integer.format(summary.visitors), note: analyticsError ? "No se pudieron cargar las visitas" : summary?.visitors === null ? "Requiere la migración de visitantes" : summary && summary.untrackedViews > 0 ? <><b>{integer.format(summary.untrackedViews)}</b> visitas anteriores sin identificar</> : <><b>Únicos</b> en {periodLabel}</>, hint: "Navegadores distintos que visitaron LIGHT", onClick: scrollToTraffic },
    { key: "conversions", label: "Conversions", value: integer.format(conversions), note: <><b>{integer.format(totals.conversions)}</b> campañas{countsSubscribers ? ` · ${integer.format(newSubscribers)} suscripciones` : ""}</>, hint: `${"Conversiones de campañas + nuevas suscripciones"} · ${PRORATE_NOTE}`, onClick: campaignsAction || (canOpen("subscribers") ? () => onNavigate("subscribers") : undefined) },
    { key: "subscribers", label: "Suscriptores", value: integer.format(subscriberCount), note: <><b>+{integer.format(newSubscribers)}</b> en {periodLabel}</>, hint: "Abrir la lista de suscriptores", tone: "newsletter", onClick: canOpen("subscribers") ? () => onNavigate("subscribers") : undefined },
  ];

  const maxImpressions = Math.max(...CAMPAIGN_CHANNELS.map((item) => channelTotals.byChannel[item.id].impressions), 0);
  const axisMax = maxImpressions ? niceCeil(maxImpressions) : 0;
  const budgetTotal = channelTotals.budget;
  const donutColors: Record<CampaignChannel, string> = { social: "var(--acid)", search: "#58708a", email: "#c9c2b8", other: "#8f8a80" };
  let cursor = 0;
  const donutStops = CAMPAIGN_CHANNELS.filter((item) => channelTotals.byChannel[item.id].budget > 0).map((item) => { const share = channelTotals.byChannel[item.id].budget / budgetTotal * 100; const stop = `${donutColors[item.id]} ${cursor}% ${cursor + share}%`; cursor += share; return stop; });

  const visibleCampaigns = sortCampaigns(campaigns.filter((campaign) => campaign.endDate >= today && matchesChannel(campaign)));
  const upcomingEvents = calendarEvents.filter((event) => event.startAt.slice(0, 10) >= utcTodayKey()).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 4);

  const activity: Activity[] = [
    ...articles.map((article): Activity => { const isPublished = article.status === "published"; return { id: `article-${article.id}`, at: (isPublished && article.publishedAt) || article.updatedAt, icon: isPublished ? "↗" : "✎", tone: isPublished ? "acid" : "blue", title: article.title || "Sin título", text: isPublished ? "está publicada en LIGHT" : "se guardó como borrador", meta: `${article.category || "Página"} · ${article.author || "LIGHT"}`, onClick: () => onOpenArticle(article) }; }),
    ...campaigns.filter((campaign) => campaign.createdAt).map((campaign): Activity => ({ id: `campaign-${campaign.id}`, at: campaign.createdAt as string, icon: "◎", tone: "soft", title: campaign.name, text: `campaña ${campaignStatusLabel[campaignStatus(campaign)].toLowerCase()}`, meta: `Campaña · ${formatScheduleDate(campaign.startDate)} — ${formatScheduleDate(campaign.endDate)}`, onClick: canOpen("campaigns") ? () => onOpenCampaign(campaign) : undefined })),
    ...subscribers.slice(0, 20).map((subscriber): Activity => ({ id: `subscriber-${subscriber.id}`, at: subscriber.subscribedAt, icon: "+", tone: "soft", title: "Nueva suscripción", text: "a Correspondencia LIGHT", meta: `Newsletter · ${subscriber.source}`, onClick: canOpen("subscribers") ? () => onNavigate("subscribers") : undefined })),
  ].filter((item) => item.at && Number.isFinite(new Date(item.at).getTime())).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);

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

    <article className="performance-panel performance-panel--traffic" ref={trafficRef}><div className="performance-panel__head"><div><p className="eyebrow">Audiencia LIGHT</p><h2>Visitas de los últimos {series.length || Math.min(range, 30)} días.</h2></div><span className="performance-panel__metric">{integer.format(series.reduce((total, point) => total + point.count, 0))} <small>visitas</small></span></div>{analyticsError && <p className="campaign-table__empty" role="alert">No se pudieron cargar las visitas. Recarga la página para intentarlo de nuevo.</p>}<div className={`traffic-chart${series.length > 15 ? " traffic-chart--dense" : ""}`} aria-label="Visitas diarias">{series.map((point) => { const max = Math.max(...series.map((item) => item.count), 1); return <div className="traffic-chart__bar" key={point.date} title={`${point.label}: ${point.count} visitas`}><i style={{ height: `${Math.max(5, (point.count / max) * 100)}%` }} /><span>{point.label}</span></div>; })}</div></article>

    <FacebrowserPanel />
    <div className="performance-grid performance-grid--charts">
      <article className="performance-panel performance-panel--chart"><div className="performance-panel__head"><div><p className="eyebrow">Canales · {periodLabel}</p><h2>Rendimiento por canal.</h2></div><span className="performance-panel__metric">{formatCompact(channelTotals.impressions)} <small>impresiones</small></span></div>
        {maxImpressions ? <><div className="channel-chart">{CAMPAIGN_CHANNELS.filter((item) => item.id !== "other" || channelTotals.byChannel.other.impressions > 0).map((item) => { const value = channelTotals.byChannel[item.id].impressions; return <button type="button" className={`channel-row channel-row--${item.id}${channel !== "all" && channel !== item.id ? " is-dimmed" : ""}${channel === item.id ? " is-selected" : ""}`} key={item.id} onClick={() => { const next = channel === item.id ? "all" : item.id; setChannel(next); store(CHANNEL_KEY, next); }} title={`${integer.format(value)} impresiones · clic para filtrar`}><div><span>{item.label}</span><small>{item.detail}</small></div><div className="channel-bar"><i style={{ width: `${(value / axisMax) * 100}%` }} /></div><strong>{percent(channelTotals.impressions ? value / channelTotals.impressions : 0, 0)}</strong></button>; })}</div><div className="performance-chart-axis">{[0, 1, 2, 3].map((step) => <span key={step}>{formatCompact(axisMax / 3 * step)}</span>)}</div></>
          : <PanelEmpty text="Aún no hay impresiones registradas en campañas de este periodo." action={canOpen("campaigns") ? () => onOpenCampaign(null) : undefined} label="Registrar campaña" />}
      </article>
      <article className="performance-panel performance-panel--allocation"><div className="performance-panel__head"><div><p className="eyebrow">Inversión</p><h2>Asignación de presupuesto.</h2></div><span className="performance-panel__metric">{formatMoney(budgetTotal)} <small>total</small></span></div>
        {budgetTotal ? <div className="donut-wrap"><div className="budget-donut" style={{ background: `conic-gradient(${donutStops.join(", ")})` }}><div><strong>{percent(channelTotals.spend / budgetTotal, 0)}</strong><span>invertido</span></div></div><div className="budget-legend">{CAMPAIGN_CHANNELS.filter((item) => channelTotals.byChannel[item.id].budget > 0).map((item) => <span key={item.id}><i className="dot" style={{ background: donutColors[item.id] }} /> {item.label} <b>{formatMoney(channelTotals.byChannel[item.id].budget)}</b></span>)}</div></div>
          : <PanelEmpty text="Define el presupuesto de cada campaña para ver su reparto por canal." action={canOpen("campaigns") ? () => onNavigate("campaigns") : undefined} label="Ir a campañas" />}
      </article>
    </div>

    <div className="performance-grid performance-grid--lower">
      <article className="performance-panel performance-panel--table"><div className="performance-panel__head"><div><p className="eyebrow">Planificación editorial</p><h2>Comparativa de campañas.</h2></div>{canOpen("calendar") && <button className="performance-link" type="button" onClick={() => onNavigate("calendar")}>Ver calendario <ArrowUpRight size={14} /></button>}</div><div className="campaign-table"><div className="campaign-table__row campaign-table__row--head"><span>Campaña / evento</span><span>Estado</span><span>Inicio</span><span>Final</span><span>Canal · ROAS</span></div>{visibleCampaigns.map((campaign) => { const status = campaignStatus(campaign); return <button type="button" className="campaign-table__row" key={`campaign-${campaign.id}`} onClick={() => onOpenCampaign(campaign)} disabled={!canOpen("campaigns")}><strong>{campaign.name}</strong><span className={`campaign-status ${status === "active" ? "campaign-status--live" : "campaign-status--draft"}`}><i /> {campaignStatusLabel[status]}</span><span>{formatScheduleDate(campaign.startDate)}</span><span>{formatScheduleDate(campaign.endDate)}</span><span>{CAMPAIGN_CHANNELS.find((item) => item.id === campaign.channel)?.label} · {campaign.spend ? `${(campaign.revenue / campaign.spend).toLocaleString("es-ES", { maximumFractionDigits: 1 })}×` : "—"}</span></button>; })}{upcomingEvents.map((event) => <button type="button" className="campaign-table__row campaign-table__row--event" key={`event-${event.id}`} onClick={() => onNavigate("calendar")} disabled={!canOpen("calendar")}><strong>{event.title}</strong><span className="campaign-status campaign-status--paused"><i /> Por venir</span><span>{formatScheduleDate(event.startAt)}{!event.allDay && <> · <UtcTime value={event.startAt} showUtcBadge /></>}</span><span>{event.endAt ? formatScheduleDate(event.endAt) : "—"}</span><span>Evento</span></button>)}{!visibleCampaigns.length && !upcomingEvents.length && <div className="campaign-table__empty">No hay campañas ni eventos próximos.{canOpen("campaigns") && <button type="button" className="performance-link" onClick={() => onOpenCampaign(null)}><Plus size={13} /> Nueva campaña</button>}</div>}</div></article>
      <article className="performance-panel performance-panel--activity"><div className="performance-panel__head"><div><p className="eyebrow">Actividad reciente</p><h2>Últimos movimientos.</h2></div></div><div className="activity-list">{activity.length ? activity.map((item) => <button type="button" key={item.id} onClick={item.onClick} disabled={!item.onClick}><span className={`activity-icon activity-icon--${item.tone}`}>{item.icon}</span><p><strong>{item.title}</strong> {item.text}<small>{relativeTime(item.at)} · {item.meta}</small></p></button>) : <p className="campaign-table__empty">Todavía no hay movimientos.</p>}</div></article>
    </div>

    <div className="performance-footer-actions"><p>{visibleCampaigns.length} campañas y {upcomingEvents.length} eventos en la planificación visible.</p><div><button className="admin-secondary" onClick={() => onNavigate("pages")} type="button">Ver páginas <ArrowUpRight size={14} /></button><button className="admin-primary" onClick={onNew} type="button"><Plus size={14} /> Crear página</button></div></div>
  </section>;
}

function PanelEmpty({ text, action, label }: { text: string; action?: () => void; label: string }) {
  return <div className="performance-empty"><p>{text}</p>{action && <button type="button" className="performance-link" onClick={action}>{label} <ArrowUpRight size={14} /></button>}</div>;
}

function niceCeil(value: number) { const magnitude = 10 ** Math.floor(Math.log10(value)); const scaled = value / magnitude; const step = scaled <= 1.5 ? 1.5 : scaled <= 3 ? 3 : scaled <= 6 ? 6 : scaled <= 9 ? 9 : 12; return step * magnitude; }
