import { supabase } from "@/lib/supabase";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  color: string;
};

function fromRow(row: Record<string, unknown>): CalendarEvent {
  return { id: String(row.id), title: String(row.title || ""), description: String(row.description || ""), startAt: String(row.start_at), endAt: row.end_at ? String(row.end_at) : null, allDay: Boolean(row.all_day), color: String(row.color || "acid") };
}

export async function fetchCalendarEvents() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data, error } = await supabase.from("calendar_events").select("*").order("start_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function saveCalendarEvent(event: Omit<CalendarEvent, "id"> & { id?: string }) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const payload = { ...(event.id ? { id: event.id } : {}), title: event.title, description: event.description, start_at: event.startAt, end_at: event.endAt, all_day: event.allDay, color: event.color };
  const { data, error } = await supabase.from("calendar_events").upsert(payload).select().single();
  if (error || !data) throw error || new Error("No se pudo guardar el evento.");
  return fromRow(data);
}

export async function deleteCalendarEvent(id: string) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}
