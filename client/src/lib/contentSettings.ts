import { useEffect, useState } from "react";
import { subscribeToTable, supabase } from "./supabase";

const LOCAL_PREFIX = "light.content-setting:";
const eventName = "light:content-setting-updated";

/**
 * Shared settings live in public.site_settings. localStorage is only a cache so the
 * first paint is instant; Supabase is always the source of truth when configured.
 */
export function readCachedSetting<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(`${LOCAL_PREFIX}${key}`) || "null") as T | null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(`${LOCAL_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // A private browsing/storage quota error must not mask a successful remote save.
  }
}

export async function getContentSetting<T>(key: string, fallback: T): Promise<T> {
  const cached = readCachedSetting<T>(key);
  if (!supabase) return cached ?? fallback;
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (error) {
    if (cached !== null) return cached;
    throw error;
  }
  const value = (data?.value as T | null | undefined) ?? fallback;
  writeCache(key, value);
  return value;
}

export async function saveContentSetting<T>(key: string, value: T): Promise<"remote" | "local"> {
  if (supabase) {
    const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  writeCache(key, value);
  window.dispatchEvent(new CustomEvent(eventName, { detail: { key } }));
  return supabase ? "remote" : "local";
}

export function contentSettingEventName() { return eventName; }

/** Listens for local saves and remote (Realtime) changes of one setting key. */
export function onContentSettingChange(key: string, callback: () => void): () => void {
  const local = (event: Event) => { const detail = (event as CustomEvent<{ key?: string }>).detail; if (!detail?.key || detail.key === key) callback(); };
  window.addEventListener(eventName, local);
  const unsubscribe = subscribeToTable("site_settings", callback, `key=eq.${key}`);
  return () => { window.removeEventListener(eventName, local); unsubscribe(); };
}

/**
 * React hook: returns the cached value immediately, then the remote one, and keeps
 * it in sync with saves made from this tab or from anyone else on the team.
 */
export function useContentSetting<T>(key: string, fallback: T, normalize: (value: unknown) => T = (value) => value as T) {
  const [value, setValue] = useState<T>(() => { const cached = readCachedSetting<unknown>(key); return cached === null ? fallback : normalize(cached); });
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    let active = true;
    const load = () => { void getContentSetting<unknown>(key, fallback).then((next) => { if (active) setValue(normalize(next)); }).catch((error) => console.warn(`[LIGHT] ${key} unavailable`, error)).finally(() => { if (active) setLoading(false); }); };
    load();
    const unsubscribe = onContentSettingChange(key, load);
    return () => { active = false; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [value, loading] as const;
}
