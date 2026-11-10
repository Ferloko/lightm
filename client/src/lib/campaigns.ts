import { supabase } from "@/lib/supabase";

const LOCAL_KEY = "light_campaigns";

export type CampaignChannel = "social" | "search" | "email" | "other";
export type CampaignStatus = "active" | "scheduled" | "ended";

export type CampaignMetrics = { budget: number; spend: number; impressions: number; clicks: number; conversions: number; revenue: number };

export type Campaign = CampaignMetrics & {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  color: string;
  channel: CampaignChannel;
  createdAt?: string;
};

export const CAMPAIGN_CHANNELS: { id: CampaignChannel; label: string; detail: string }[] = [
  { id: "social", label: "Social", detail: "Instagram · TikTok" },
  { id: "search", label: "Search", detail: "Google · Direct" },
  { id: "email", label: "Email", detail: "Newsletter · CRM" },
  { id: "other", label: "Otros", detail: "Prensa · Eventos" },
];

export const emptyMetrics: CampaignMetrics = { budget: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
const metricKeys = Object.keys(emptyMetrics) as (keyof CampaignMetrics)[];

/** Local calendar day (YYYY-MM-DD). Avoids UTC drift: a campaign ending today stays active until local midnight. */
export function todayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function addDaysKey(key: string, days: number) { const date = new Date(`${key}T12:00:00`); date.setDate(date.getDate() + days); return todayKey(date); }

function num(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
function channelOf(value: unknown): CampaignChannel { return CAMPAIGN_CHANNELS.some((item) => item.id === value) ? value as CampaignChannel : "social"; }
function normalize(raw: Partial<Campaign> & { id: string }): Campaign {
  return { id: raw.id, name: String(raw.name || ""), description: String(raw.description || ""), startDate: String(raw.startDate || todayKey()).slice(0, 10), endDate: String(raw.endDate || raw.startDate || todayKey()).slice(0, 10), color: String(raw.color || "acid"), channel: channelOf(raw.channel), createdAt: raw.createdAt, ...Object.fromEntries(metricKeys.map((key) => [key, num(raw[key])])) as CampaignMetrics };
}
function readLocal(): Campaign[] { try { const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); return Array.isArray(value) ? value.filter((item) => item?.id).map(normalize) : []; } catch { return []; } }
function fromRow(row: Record<string, unknown>): Campaign {
  return normalize({ id: String(row.id), name: row.name as string, description: row.description as string, startDate: String(row.start_date), endDate: String(row.end_date), color: row.color as string, channel: row.channel as CampaignChannel, createdAt: row.created_at ? String(row.created_at) : undefined, budget: row.budget as number, spend: row.spend as number, impressions: row.impressions as number, clicks: row.clicks as number, conversions: row.conversions as number, revenue: row.revenue as number });
}
/** True when the database has not received the metrics migration yet (missing column). */
function isMissingColumn(error: { code?: string; message?: string } | null) { return Boolean(error && (error.code === "PGRST204" || error.code === "42703" || /column .* does not exist|Could not find the '.*' column/i.test(error.message || ""))); }

export let campaignMetricsAvailable = true;

export async function fetchCampaigns() {
  if (supabase) { const { data, error } = await supabase.from("campaigns").select("*").order("start_date", { ascending: false }); if (error) throw error; const rows = data || []; if (rows.length) campaignMetricsAvailable = "spend" in rows[0]; return sortCampaigns(rows.map(fromRow)); }
  return sortCampaigns(readLocal());
}

export async function saveCampaign(campaign: Omit<Campaign, "id"> & { id?: string }) {
  if (supabase) {
    const base = { ...(campaign.id && !campaign.id.startsWith("campaign-") ? { id: campaign.id } : {}), name: campaign.name, description: campaign.description, start_date: campaign.startDate, end_date: campaign.endDate, color: campaign.color };
    const metrics = { channel: campaign.channel, ...Object.fromEntries(metricKeys.map((key) => [key, num(campaign[key])])) };
    let { data, error } = await supabase.from("campaigns").upsert({ ...base, ...metrics }).select().single();
    if (isMissingColumn(error)) { campaignMetricsAvailable = false; ({ data, error } = await supabase.from("campaigns").upsert(base).select().single()); }
    else if (!error) campaignMetricsAvailable = true;
    if (error) throw error;
    return fromRow(data as Record<string, unknown>);
  }
  const next = normalize({ ...campaign, id: campaign.id || `campaign-${Date.now()}`, createdAt: campaign.createdAt || new Date().toISOString() });
  localStorage.setItem(LOCAL_KEY, JSON.stringify([...readLocal().filter((item) => item.id !== next.id), next]));
  return next;
}

export async function deleteCampaign(id: string) {
  if (supabase) { const { error } = await supabase.from("campaigns").delete().eq("id", id); if (error) throw error; return; }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(readLocal().filter((item) => item.id !== id)));
}

export function campaignStatus(campaign: Campaign, date = new Date()): CampaignStatus { const today = todayKey(date); if (campaign.endDate < today) return "ended"; if (campaign.startDate > today) return "scheduled"; return "active"; }
export function isCampaignActive(campaign: Campaign, date = new Date()) { return campaignStatus(campaign, date) === "active"; }
export const campaignStatusLabel: Record<CampaignStatus, string> = { active: "Activa", scheduled: "Programada", ended: "Finalizada" };

/** Active first (ending soonest), then scheduled (starting soonest), then ended (most recent first). */
export function sortCampaigns(campaigns: Campaign[]) {
  const rank: Record<CampaignStatus, number> = { active: 0, scheduled: 1, ended: 2 };
  return [...campaigns].sort((a, b) => { const sa = campaignStatus(a); const sb = campaignStatus(b); if (sa !== sb) return rank[sa] - rank[sb]; if (sa === "active") return a.endDate.localeCompare(b.endDate); if (sa === "scheduled") return a.startDate.localeCompare(b.startDate); return b.endDate.localeCompare(a.endDate); });
}

/** Share of the campaign window already elapsed (0–1). */
export function campaignProgress(campaign: Campaign, date = new Date()) {
  const start = new Date(`${campaign.startDate}T00:00:00`).getTime(); const end = new Date(`${campaign.endDate}T23:59:59`).getTime(); const now = date.getTime();
  if (now <= start) return 0; if (now >= end) return 1; return (now - start) / Math.max(end - start, 1);
}

export function campaignOverlaps(campaign: Campaign, from: string, to: string) { return campaign.startDate <= to && campaign.endDate >= from; }

export type CampaignSummary = CampaignMetrics & { count: number; ctr: number | null; roas: number | null; byChannel: Record<CampaignChannel, CampaignMetrics> };

export function summarizeCampaigns(campaigns: Campaign[]): CampaignSummary {
  const byChannel = Object.fromEntries(CAMPAIGN_CHANNELS.map((item) => [item.id, { ...emptyMetrics }])) as Record<CampaignChannel, CampaignMetrics>;
  const totals = { ...emptyMetrics };
  campaigns.forEach((campaign) => metricKeys.forEach((key) => { totals[key] += campaign[key]; byChannel[campaign.channel][key] += campaign[key]; }));
  return { ...totals, count: campaigns.length, ctr: totals.impressions ? totals.clicks / totals.impressions : null, roas: totals.spend ? totals.revenue / totals.spend : null, byChannel };
}

export function campaignCtr(campaign: Campaign) { return campaign.impressions ? campaign.clicks / campaign.impressions : null; }
export function campaignRoas(campaign: Campaign) { return campaign.spend ? campaign.revenue / campaign.spend : null; }

function dayCount(from: string, to: string) { return to < from ? 0 : Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000) + 1; }

/**
 * Campaign metrics are stored as running totals, not per day. To report a period without counting results from
 * outside it, results are spread evenly over the days the campaign has run so far, and the budget over its whole window.
 */
export function prorateCampaign(campaign: Campaign, from: string, to: string, today = todayKey()): Campaign {
  const ranEnd = campaign.endDate < today ? campaign.endDate : today;
  const ranDays = dayCount(campaign.startDate, ranEnd);
  const overlapStart = campaign.startDate > from ? campaign.startDate : from;
  const resultShare = ranDays ? dayCount(overlapStart, ranEnd < to ? ranEnd : to) / ranDays : 0;
  const totalDays = dayCount(campaign.startDate, campaign.endDate);
  const budgetShare = totalDays ? dayCount(overlapStart, campaign.endDate < to ? campaign.endDate : to) / totalDays : 0;
  const scale = (value: number) => value * resultShare;
  return { ...campaign, spend: scale(campaign.spend), impressions: scale(campaign.impressions), clicks: scale(campaign.clicks), conversions: scale(campaign.conversions), revenue: scale(campaign.revenue), budget: campaign.budget * budgetShare };
}
