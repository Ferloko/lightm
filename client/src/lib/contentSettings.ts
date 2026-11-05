import { supabase } from "./supabase";

export async function getContentSetting<T>(key: string, fallback: T): Promise<T> {
  if (!supabase) return fallback;
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data?.value as T | null) ?? fallback;
}

export async function saveContentSetting<T>(key: string, value: T): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
