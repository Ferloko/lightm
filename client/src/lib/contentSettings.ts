import { supabase } from "./supabase";

const LOCAL_PREFIX = "light.content-setting:";
const eventName = "light:content-setting-updated";

function readLocal<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(`${LOCAL_PREFIX}${key}`) || "null") as T | null;
  } catch {
    return null;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(`${LOCAL_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // A private browsing/storage quota error must not mask a successful remote save.
  }
}

export async function getContentSetting<T>(key: string, fallback: T): Promise<T> {
  const local = readLocal<T>(key);
  if (!supabase) return local ?? fallback;
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (error) {
    if (local !== null) return local;
    throw error;
  }
  return (data?.value as T | null) ?? local ?? fallback;
}

export async function saveContentSetting<T>(key: string, value: T): Promise<"remote" | "local"> {
  const remote = Boolean(supabase);
  if (supabase) {
    const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  writeLocal(key, value);
  window.dispatchEvent(new CustomEvent(eventName, { detail: { key } }));
  return remote ? "remote" : "local";
}

export function contentSettingEventName() { return eventName; }
