import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Browser client for Vite + React.
 * Without these public variables the app falls back to a local demo — but only in
 * development, or when VITE_ENABLE_DEMO=true is set explicitly. In a production build
 * without Supabase the editorial login stays closed instead of opening a fake dashboard.
 */
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
export const isSupabaseConfigured = Boolean(supabase);
export const isDemoMode = !supabase && (import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === "true");

/** Formats a Supabase/PostgREST error into one readable line. */
export function describeError(error: unknown): string {
  if (!error) return "error desconocido";
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    return [record.message, record.details, record.hint, record.code ? `(${record.code})` : ""].filter(Boolean).join(" ") || "error desconocido";
  }
  return String(error);
}

/** Calls `onChange` whenever a row of `table` changes in Supabase (Realtime). */
export function subscribeToTable(table: string, onChange: () => void, filter?: string): () => void {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client
    .channel(`light-${table}-${filter || "all"}-${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, () => onChange())
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
