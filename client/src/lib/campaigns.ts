import { supabase } from "@/lib/supabase";

export type Campaign = { id: string; name: string; description: string; startDate: string; endDate: string; color: string; createdAt?: string };

function fromRow(row: Record<string, unknown>): Campaign { return { id: String(row.id), name: String(row.name || ""), description: String(row.description || ""), startDate: String(row.start_date), endDate: String(row.end_date), color: String(row.color || "acid"), createdAt: row.created_at ? String(row.created_at) : undefined }; }

export async function fetchCampaigns() {
  if (!supabase) throw new Error("Supabase no está configurado."); const { data, error } = await supabase.from("campaigns").select("*").order("start_date", { ascending: false }); if (error) throw error; return (data || []).map(fromRow);
}

export async function saveCampaign(campaign: Omit<Campaign, "id"> & { id?: string }) {
  if (!supabase) throw new Error("Supabase no está configurado."); const payload = { ...(campaign.id ? { id: campaign.id } : {}), name: campaign.name, description: campaign.description, start_date: campaign.startDate, end_date: campaign.endDate, color: campaign.color }; const { data, error } = await supabase.from("campaigns").upsert(payload).select().single(); if (error || !data) throw error || new Error("No se pudo guardar la campaña."); return fromRow(data);
}

export async function deleteCampaign(id: string) {
  if (!supabase) throw new Error("Supabase no está configurado."); const { error } = await supabase.from("campaigns").delete().eq("id", id); if (error) throw error;
}

export function isCampaignActive(campaign: Campaign, date = new Date()) { const today = date.toISOString().slice(0, 10); return campaign.startDate <= today && campaign.endDate >= today; }
