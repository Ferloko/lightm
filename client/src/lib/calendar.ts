import { supabase } from "@/lib/supabase";
// localStorage is used ONLY in the local demo (no Supabase). With Supabase, errors are surfaced.

const LOCAL_KEY = "light_calendar_events";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  color: string;
};

function readLocalEvents(): CalendarEvent[] {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function fromRow(row: Record<string, unknown>): CalendarEvent {
  return { id: String(row.id), title: String(row.title || ""), description: String(row.description || ""), startAt: String(row.start_at), endAt: row.end_at ? String(row.end_at) : null, allDay: Boolean(row.all_day), color: String(row.color || "acid") };
}

export async function fetchCalendarEvents() {
  if (supabase) {
    const { data, error } = await supabase.from("calendar_events").select("*").order("start_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(fromRow);
  }
  return readLocalEvents();
}

export async function saveCalendarEvent(event: Omit<CalendarEvent, "id"> & { id?: string }) {
  if (supabase) {
    const payload = { ...(event.id && !event.id.startsWith("event-") ? { id: event.id } : {}), title: event.title, description: event.description, start_at: event.startAt, end_at: event.endAt, all_day: event.allDay, color: event.color };
    const { data, error } = await supabase.from("calendar_events").upsert(payload).select().single();
    if (error) throw error;
    return fromRow(data);
  }
  const next = { ...event, id: event.id || `event-${Date.now()}` } as CalendarEvent;
  const events = readLocalEvents().filter((item) => item.id !== next.id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify([...events, next]));
  return next;
}

export async function deleteCalendarEvent(id: string) {
  if (supabase) {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(readLocalEvents().filter((event) => event.id !== id)));
}
