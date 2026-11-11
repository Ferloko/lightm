import { supabase } from "@/lib/supabase";
// localStorage is used ONLY in the local demo (no Supabase). With Supabase, errors are surfaced.

const LOCAL_KEY = "light_calendar_events";

/**
 * Las horas del calendario son UTC. En la app se manejan como texto "YYYY-MM-DDTHH:mm" (hora UTC)
 * y se guardan en la base como instantes con "Z". Cada visitante ve además su hora local al pasar
 * el ratón (ver UtcTime).
 */
const WALL = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/;

/** Instante (cualquier formato ISO) → "YYYY-MM-DDTHH:mm" en UTC. */
export function toUtcWall(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return date.toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" (UTC) → ISO con Z para la base de datos. */
export function toUtcIso(wall: string): string {
  const match = WALL.exec(wall);
  if (!match) return wall;
  return `${match[1]}T${match[2] || "00:00"}:00Z`;
}

/** "YYYY-MM-DDTHH:mm" (UTC) → Date. */
export function utcWallToDate(wall: string): Date {
  return new Date(toUtcIso(wall));
}

/** Hoy en UTC (YYYY-MM-DD). */
export function utcTodayKey(date = new Date()) { return date.toISOString().slice(0, 10); }

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
  return { id: String(row.id), title: String(row.title || ""), description: String(row.description || ""), startAt: toUtcWall(String(row.start_at)), endAt: row.end_at ? toUtcWall(String(row.end_at)) : null, allDay: Boolean(row.all_day), color: String(row.color || "acid") };
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
    const payload = { ...(event.id && !event.id.startsWith("event-") ? { id: event.id } : {}), title: event.title, description: event.description, start_at: toUtcIso(event.startAt), end_at: event.endAt ? toUtcIso(event.endAt) : null, all_day: event.allDay, color: event.color };
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
