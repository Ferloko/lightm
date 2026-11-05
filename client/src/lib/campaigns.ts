import { supabase } from "@/lib/supabase";

const LOCAL_KEY = "light_campaigns";

export type Campaign = { id: string; name: string; description: string; startDate: string; endDate: string; color: string; createdAt?: string };

function readLocal(): Campaign[] { try { const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function fromRow(row: Record<string, unknown>): Campaign { return { id: String(row.id), name: String(row.name || ""), description: String(row.description || ""), startDate: String(row.start_date), endDate: String(row.end_date), color: String(row.color || "acid"), createdAt: row.created_at ? String(row.created_at) : undefined }; }

export async function fetchCampaigns() {
  if (supabase) { const { data, error } = await supabase.from("campaigns").select("*").order("start_date", { ascending: false }); if (!error && data) return data.map(fromRow); console.warn("[LIGHT] Campaigns unavailable; using local fallback", error?.message); }
  return readLocal();
}

export async function saveCampaign(campaign: Omit<Campaign, "id"> & { id?: string }) {
  if (supabase) { const payload = { ...(campaign.id ? { id: campaign.id } : {}), name: campaign.name, description: campaign.description, start_date: campaign.startDate, end_date: campaign.endDate, color: campaign.color }; const { data, error } = await supabase.from("campaigns").upsert(payload).select().single(); if (!error && data) return fromRow(data); console.warn("[LIGHT] Campaign save unavailable; using local fallback", error?.message); }
  const next = { ...campaign, id: campaign.id || `campaign-${Date.now()}` } as Campaign; localStorage.setItem(LOCAL_KEY, JSON.stringify([...readLocal().filter((item) => item.id !== next.id), next])); return next;
}

export async function deleteCampaign(id: string) {
  if (supabase) { const { error } = await supabase.from("campaigns").delete().eq("id", id); if (!error) return; console.warn("[LIGHT] Campaign delete unavailable; using local fallback", error.message); }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(readLocal().filter((item) => item.id !== id)));
}

export function isCampaignActive(campaign: Campaign, date = new Date()) { const today = date.toISOString().slice(0, 10); return campaign.startDate <= today && campaign.endDate >= today; }
