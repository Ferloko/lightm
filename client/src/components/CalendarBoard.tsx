import { ChevronLeft, ChevronRight, Maximize2, Plus, Target, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteCalendarEvent, fetchCalendarEvents, saveCalendarEvent, utcTodayKey, type CalendarEvent } from "@/lib/calendar";
import UtcTime, { describeLocal, localZoneLabel } from "@/components/UtcTime";
import { addDaysKey, campaignStatus, todayKey, type Campaign } from "@/lib/campaigns";
import { describeError, subscribeToTable } from "@/lib/supabase";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const colors = ["acid", "blue", "soft"];
const MAX_VISIBLE = 3;
const SHOW_CAMPAIGNS_KEY = "light.calendar.show-campaigns";

/** Event times are UTC wall-clock strings ("YYYY-MM-DDTHH:mm"): the grid and the inputs are in UTC; UtcTime shows each viewer their local time. */
const dayOf = (value: string) => value.slice(0, 10);
const timeOf = (value: string) => value.slice(11, 16) || "10:00";
const endDayOf = (event: Pick<CalendarEvent, "startAt" | "endAt">) => { const end = event.endAt ? dayOf(event.endAt) : dayOf(event.startAt); return end < dayOf(event.startAt) ? dayOf(event.startAt) : end; };
const daysBetween = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000);
function monthLabel(date: Date) { return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date); }
function longDay(key: string) { return new Date(`${key}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }); }
function buildDays(month: Date) { const first = new Date(month.getFullYear(), month.getMonth(), 1); const start = (first.getDay() + 6) % 7; const total = Math.ceil((start + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7; return Array.from({ length: total }, (_, index) => todayKey(new Date(month.getFullYear(), month.getMonth(), index - start + 1))); }
function readShowCampaigns() { try { return localStorage.getItem(SHOW_CAMPAIGNS_KEY) !== "0"; } catch { return true; } }

type Props = { readOnly?: boolean; events?: CalendarEvent[]; onEventsChange?: (events: CalendarEvent[]) => void; campaigns?: Campaign[]; onOpenCampaign?: (campaign: Campaign) => void };
type Draft = Partial<CalendarEvent> & { startAt: string };
type Selection = { anchor: string; current: string };
type DayLayout = { strips: (Chip | null)[]; stack: (Chip | null)[] };
type Chip = { kind: "event"; event: CalendarEvent; isStart: boolean; isEnd: boolean } | { kind: "campaign"; campaign: Campaign; isStart: boolean; isEnd: boolean };

export default function CalendarBoard({ readOnly = false, events: controlledEvents, onEventsChange, campaigns = [], onOpenCampaign }: Props) {
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getUTCFullYear(), now.getUTCMonth(), 1); });
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(controlledEvents || []);
  const events = controlledEvents ?? localEvents;
  // Always apply updates to the latest list, even across awaits (optimistic updates + server replies).
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const setEvents = useCallback((updater: (current: CalendarEvent[]) => CalendarEvent[]) => { const next = updater(eventsRef.current).sort((a, b) => a.startAt.localeCompare(b.startAt)); eventsRef.current = next; if (onEventsChange) onEventsChange(next); else setLocalEvents(next); }, [onEventsChange]);
  const [peek, setPeek] = useState<Draft | null>(null);
  const [peekOriginal, setPeekOriginal] = useState<string>("");
  const [quick, setQuick] = useState<{ start: string; end: string; title: string } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragging, setDragging] = useState<{ id: string; grabDay: string } | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showCampaigns, setShowCampaigns] = useState(readShowCampaigns);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const days = useMemo(() => buildDays(month), [month]);
  const today = utcTodayKey(); // el calendario va en UTC
  const selecting = useRef(false);

  // Standalone use (no parent state): load and stay live by itself.
  useEffect(() => {
    if (controlledEvents) return;
    let active = true;
    const load = () => { fetchCalendarEvents().then((items) => { if (active) { setLocalEvents(items); setError(""); } }).catch((cause) => { if (active) setError(`No se pudo cargar el calendario: ${describeError(cause)}`); }); };
    load(); const unsubscribe = subscribeToTable("calendar_events", load);
    return () => { active = false; unsubscribe(); };
  }, [controlledEvents]);

  /**
   * Saves one event. On failure only that event is rolled back (its previous version is restored,
   * or its optimistic placeholder removed), so edits or live updates made meanwhile are kept.
   */
  const persist = async (next: CalendarEvent, rollback: { before?: CalendarEvent; placeholderId?: string } = {}) => {
    try { const saved = await saveCalendarEvent({ ...next, id: next.id || undefined }); setEvents((current) => [...current.filter((item) => item.id !== saved.id && item.id !== next.id && item.id !== rollback.placeholderId), saved]); return saved; }
    catch (cause) {
      if (rollback.placeholderId) setEvents((current) => current.filter((item) => item.id !== rollback.placeholderId));
      else if (rollback.before) { const before = rollback.before; setEvents((current) => current.map((item) => item.id === before.id ? before : item)); }
      setError(`No se pudo guardar el evento: ${describeError(cause)}`); return null;
    }
  };

  // Notion-style layout: per week, campaigns and multi-day events keep a fixed lane so their bars line up across days.
  const layout = useMemo(() => {
    type Item = { start: string; end: string; chip: (key: string) => Chip };
    const map = new Map<string, DayLayout>();
    const campaignItems: Item[] = showCampaigns ? campaigns.map((campaign) => ({ start: campaign.startDate, end: campaign.endDate, chip: (key: string) => ({ kind: "campaign" as const, campaign, isStart: key === campaign.startDate, isEnd: key === campaign.endDate }) })) : [];
    const spanning: Item[] = []; const singles: CalendarEvent[] = [];
    events.forEach((event) => { const start = dayOf(event.startAt); const end = endDayOf(event); if (end > start) spanning.push({ start, end, chip: (key: string) => ({ kind: "event" as const, event, isStart: key === start, isEnd: key === end }) }); else singles.push(event); });
    const lanesFor = (items: Item[], weekDays: string[]) => {
      const from = weekDays[0]; const to = weekDays[6];
      const inWeek = items.filter((item) => item.start <= to && item.end >= from).sort((x, y) => x.start.localeCompare(y.start) || y.end.localeCompare(x.end));
      const laneEnds: string[] = []; const placed: { item: Item; lane: number }[] = [];
      inWeek.forEach((item) => { const start = item.start < from ? from : item.start; let lane = laneEnds.findIndex((end) => end < start); if (lane === -1) { lane = laneEnds.length; laneEnds.push(item.end); } else laneEnds[lane] = item.end; placed.push({ item, lane }); });
      return weekDays.map((key) => { const row: (Chip | null)[] = Array(laneEnds.length).fill(null); placed.forEach(({ item, lane }) => { if (item.start <= key && item.end >= key) row[lane] = item.chip(key); }); return row; });
    };
    for (let week = 0; week < days.length; week += 7) {
      const weekDays = days.slice(week, week + 7);
      const strips = lanesFor(campaignItems, weekDays); const lanes = lanesFor(spanning, weekDays);
      weekDays.forEach((key, index) => {
        const daySingles = singles.filter((event) => dayOf(event.startAt) === key).sort((x, y) => (x.allDay ? "00:00" : timeOf(x.startAt)).localeCompare(y.allDay ? "00:00" : timeOf(y.startAt))).map((event): Chip => ({ kind: "event", event, isStart: true, isEnd: true }));
        map.set(key, { strips: strips[index], stack: [...lanes[index], ...daySingles] });
      });
    }
    return map;
  }, [events, campaigns, days, showCampaigns]);

  const inSelection = (key: string) => { if (!selection) return false; const [a, b] = [selection.anchor, selection.current].sort(); return key >= a && key <= b; };
  const openPeek = (draft: Draft) => { setQuick(null); setPeek(draft); setPeekOriginal(JSON.stringify(draft)); setError(""); };
  const openEvent = (event: CalendarEvent) => openPeek({ ...event });
  const startQuick = (start: string, end = start) => { if (readOnly) return; setPeek(null); setQuick({ start, end, title: "" }); };

  const createQuick = async (openAfter = false) => {
    if (!quick) return;
    const title = quick.title.trim();
    const draft: Draft = { title, description: "", startAt: `${quick.start}T10:00`, endAt: quick.end !== quick.start ? `${quick.end}T10:00` : null, allDay: true, color: "acid" };
    if (openAfter || !title) { if (openAfter) openPeek(draft); else setQuick(null); return; }
    setQuick(null);
    const temp: CalendarEvent = { ...draft, id: `event-pending-${Date.now()}`, title, description: "", endAt: draft.endAt ?? null, allDay: true, color: "acid" };
    setEvents((current) => [...current, temp]);
    await persist({ ...temp, id: "" }, { placeholderId: temp.id });
  };

  const savePeek = async () => {
    // One save at a time: closing again (Esc, backdrop, button) while a new event is being stored must not create copies.
    if (savingRef.current) return;
    if (!peek || readOnly) { setPeek(null); return; }
    const dirty = JSON.stringify(peek) !== peekOriginal;
    if (!peek.title?.trim()) { if (!peek.id) { setPeek(null); return; } setError("El evento necesita un título."); return; }
    // A new event (no id yet) is always saved, even when it arrives already titled from the quick form.
    if (peek.id && !dirty) { setPeek(null); return; }
    const endAt = peek.endAt && dayOf(peek.endAt) > dayOf(peek.startAt) ? peek.endAt : peek.allDay ? null : peek.endAt && peek.endAt > peek.startAt ? peek.endAt : null;
    savingRef.current = true; setSaving(true);
    const next: CalendarEvent = { id: peek.id || "", title: peek.title.trim(), description: peek.description || "", startAt: peek.startAt, endAt, allDay: peek.allDay ?? true, color: peek.color || "acid" };
    const before = next.id ? eventsRef.current.find((item) => item.id === next.id) : undefined;
    if (next.id) setEvents((current) => current.map((item) => item.id === next.id ? next : item));
    const saved = await persist(next, { before });
    savingRef.current = false; setSaving(false);
    if (saved) setPeek(null);
  };
  const removePeek = async () => { if (!peek?.id || readOnly || !window.confirm("¿Eliminar este evento?")) return; const id = peek.id; const removed = eventsRef.current.find((item) => item.id === id); setEvents((current) => current.filter((item) => item.id !== id)); setPeek(null); try { await deleteCalendarEvent(id); } catch (cause) { if (removed) setEvents((current) => current.some((item) => item.id === id) ? current : [...current, removed]); setError(`No se pudo eliminar: ${describeError(cause)}`); } };

  const moveEvent = async (id: string, grabDay: string, targetDay: string) => {
    const event = events.find((item) => item.id === id); if (!event) return;
    const delta = daysBetween(grabDay, targetDay); if (!delta) return;
    const shift = (value: string) => `${addDaysKey(dayOf(value), delta)}${value.slice(10, 16) ? value.slice(10, 16) : "T10:00"}`;
    const next: CalendarEvent = { ...event, startAt: shift(event.startAt), endAt: event.endAt ? shift(event.endAt) : null };
    setEvents((current) => current.map((item) => item.id === id ? next : item));
    await persist(next, { before: event });
  };

  // Keyboard: Esc closes, ← → change month, T jumps to today.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
      if (event.key === "Escape") { if (peek) void savePeek(); setQuick(null); setExpandedDay(null); setSelection(null); return; }
      if (typing || peek || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft") setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1));
      if (event.key === "ArrowRight") setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1));
      if (event.key.toLowerCase() === "t") { const now = new Date(); setMonth(new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => { const end = () => { if (!selecting.current) return; selecting.current = false; setSelection((current) => { if (current) { const [a, b] = [current.anchor, current.current].sort(); startQuick(a, b); } return null; }); }; window.addEventListener("pointerup", end); return () => window.removeEventListener("pointerup", end); });

  const visibleMonthEvents = events.filter((event) => dayOf(event.startAt).slice(0, 7) === todayKey(month).slice(0, 7)).length;
  const activeCampaigns = campaigns.filter((campaign) => campaignStatus(campaign) === "active").length;

  return <section className={`calendar-board${peek ? " has-peek" : ""}`}>
    <div className="calendar-heading"><div><p className="eyebrow">LIGHT / Equipo editorial</p><h2>Calendario.</h2><p className="calendar-utc-note">Las horas se escriben y se ven en <strong>UTC</strong>. Pasa el ratón por una hora para ver la tuya ({localZoneLabel()}).</p><p>Arrastra para mover, selecciona varios días para crear un evento largo y haz clic para abrirlo en el panel lateral. Todo se comparte en directo con el equipo.</p></div>{!readOnly && <button className="admin-primary" type="button" onClick={() => openPeek({ title: "", description: "", startAt: `${today}T10:00`, endAt: null, allDay: true, color: "acid" })}><Plus size={15} /> Nuevo evento</button>}</div>
    {error && <p className="admin-notice admin-notice--error" role="alert">{error} <button type="button" className="calendar-inline-link" onClick={() => setError("")}>Cerrar</button></p>}
    <div className="calendar-toolbar">
      <strong>{monthLabel(month)}</strong>
      <small>{visibleMonthEvents} eventos{campaigns.length ? ` · ${activeCampaigns} campañas activas` : ""}</small>
      <div className="calendar-toolbar__nav">
        {campaigns.length > 0 && <label className="calendar-toggle"><input type="checkbox" checked={showCampaigns} onChange={(event) => { setShowCampaigns(event.target.checked); try { localStorage.setItem(SHOW_CAMPAIGNS_KEY, event.target.checked ? "1" : "0"); } catch { /* ignore */ } }} /> Campañas</label>}
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mes anterior" title="Mes anterior (←)"><ChevronLeft size={16} /></button>
        <button className="calendar-today" type="button" onClick={() => { const now = new Date(); setMonth(new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)); }} title="Hoy (T)">Hoy</button>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Mes siguiente" title="Mes siguiente (→)"><ChevronRight size={16} /></button>
      </div>
    </div>
    <div className="calendar-grid" onPointerLeave={() => setDropDay(null)}>
      {weekdays.map((day, index) => <div className={`calendar-weekday${index > 4 ? " is-weekend" : ""}`} key={day}>{day}</div>)}
      {days.map((key, index) => {
        const dayLayout = layout.get(key) || { strips: [], stack: [] };
        const expanded = expandedDay === key;
        const shown = expanded ? dayLayout.stack : dayLayout.stack.slice(0, MAX_VISIBLE);
        const hiddenCount = dayLayout.stack.slice(MAX_VISIBLE).filter(Boolean).length;
        const outside = key.slice(0, 7) !== todayKey(month).slice(0, 7);
        const classes = ["calendar-day", outside && "is-outside", key === today && "is-today", index % 7 > 4 && "is-weekend", inSelection(key) && "is-selected", dropDay === key && "is-drop", expanded && "is-expanded"].filter(Boolean).join(" ");
        return <div className={classes} key={key}
          onPointerDown={(event) => { if (readOnly || event.button !== 0 || (event.target as HTMLElement).closest("button, input, form")) return; selecting.current = true; setSelection({ anchor: key, current: key }); }}
          onPointerEnter={() => { if (selecting.current) setSelection((current) => current ? { ...current, current: key } : current); }}
          onDragOver={(event) => { if (!dragging) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; if (dropDay !== key) setDropDay(key); }}
          onDrop={(event) => { event.preventDefault(); if (dragging) void moveEvent(dragging.id, dragging.grabDay, key); setDragging(null); setDropDay(null); }}>
          <div className="calendar-day__head"><span className="calendar-day__number">{key.endsWith("-01") ? new Date(`${key}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "") : Number(key.slice(8))}</span>{!readOnly && <button className="calendar-day__add" type="button" onClick={() => startQuick(key)} aria-label={`Crear evento el ${longDay(key)}`}><Plus size={13} /></button>}</div>
          <div className="calendar-day__events">
            {dayLayout.strips.map((chip, lane) => chip && chip.kind === "campaign" ? <button type="button" key={`c-${chip.campaign.id}`} className={`calendar-campaign calendar-campaign--${chip.campaign.color}${chip.isStart ? " is-start" : " is-continued"}${chip.isEnd ? " is-end" : " continues"}`} onClick={() => onOpenCampaign?.(chip.campaign)} disabled={!onOpenCampaign} title={`Campaña · ${chip.campaign.name}`}>{(chip.isStart || index % 7 === 0) ? <><Target size={9} /> {chip.campaign.name}</> : " "}</button> : <div className="calendar-spacer calendar-spacer--strip" key={`cs-${lane}`} />)}
            {shown.map((chip, slot) => {
              if (!chip || chip.kind !== "event") return <div className="calendar-spacer" key={`s-${slot}`} />;
              const edge = `${chip.isStart ? " is-start" : " is-continued"}${chip.isEnd ? " is-end" : " continues"}`;
              const { event } = chip; const pending = event.id.startsWith("event-pending-");
              return <button type="button" key={`e-${event.id}`} className={`calendar-event calendar-event--${event.color}${edge}${dragging?.id === event.id ? " is-dragging" : ""}${pending ? " is-pending" : ""}`}
                draggable={!readOnly && !pending} onDragStart={(drag) => { drag.dataTransfer.effectAllowed = "move"; drag.dataTransfer.setData("text/plain", event.id); setDragging({ id: event.id, grabDay: key }); }} onDragEnd={() => { setDragging(null); setDropDay(null); }}
                onClick={() => !pending && openEvent(event)} title={event.title}>
                {(chip.isStart || index % 7 === 0) ? <>{!event.allDay && chip.isStart && <UtcTime value={event.startAt} />}{event.title || "Sin título"}</> : " "}
              </button>;
            })}
            {(hiddenCount > 0 || expanded) && <button type="button" className="calendar-more" onClick={() => setExpandedDay(expanded ? null : key)}>{expanded ? "Mostrar menos" : `+${hiddenCount} más`}</button>}
            {quick && quick.start === key && <form className="calendar-quick" onSubmit={(event) => { event.preventDefault(); void createQuick(); }}>
              <input autoFocus value={quick.title} placeholder={quick.end !== quick.start ? `Evento hasta el ${Number(quick.end.slice(8))}…` : "Escribe un título…"} onChange={(event) => setQuick({ ...quick, title: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setQuick(null); } }} onBlur={() => { window.setTimeout(() => setQuick((current) => current && current.start === key && !current.title.trim() ? null : current), 120); }} />
              <div><button type="submit" disabled={!quick.title.trim()}>Crear ↵</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void createQuick(true)} title="Abrir en panel"><Maximize2 size={11} /></button></div>
            </form>}
          </div>
        </div>;
      })}
    </div>

    {peek && createPortal(<div className="calendar-peek-root"><div className="calendar-peek-backdrop" onMouseDown={() => void savePeek()} /><aside className="calendar-peek" aria-label="Detalle del evento">
      <div className="calendar-peek__bar"><span>{readOnly ? "Solo lectura" : peek.id ? (saving ? "Guardando…" : "Se guarda al cerrar") : "Nuevo evento"}</span><div>{peek.id && !readOnly && <button type="button" onClick={() => void removePeek()} aria-label="Eliminar evento" title="Eliminar"><Trash2 size={15} /></button>}<button type="button" onClick={() => void savePeek()} aria-label="Cerrar" title="Cerrar (Esc)"><X size={17} /></button></div></div>
      <fieldset disabled={readOnly}>
        <textarea className="calendar-peek__title" autoFocus={!peek.id} rows={1} value={peek.title || ""} placeholder="Sin título" onChange={(event) => setPeek({ ...peek, title: event.target.value.replace(/\n/g, "") })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void savePeek(); } }} />
        <div className="calendar-peek__props">
          <span>Todo el día</span><label className="calendar-switch"><input type="checkbox" checked={peek.allDay ?? true} onChange={(event) => setPeek({ ...peek, allDay: event.target.checked })} /><i /></label>
          <span>Inicio <small className="calendar-utc-tag">UTC</small></span><div className="calendar-peek__when"><input type="date" value={dayOf(peek.startAt)} onChange={(event) => { if (!event.target.value) return; const delta = daysBetween(dayOf(peek.startAt), event.target.value); setPeek({ ...peek, startAt: `${event.target.value}T${timeOf(peek.startAt)}`, endAt: peek.endAt ? `${addDaysKey(dayOf(peek.endAt), delta)}T${timeOf(peek.endAt)}` : null }); }} />{!(peek.allDay ?? true) && <input type="time" value={timeOf(peek.startAt)} onChange={(event) => setPeek({ ...peek, startAt: `${dayOf(peek.startAt)}T${event.target.value || "10:00"}` })} />}</div>
          <span>Final <small className="calendar-utc-tag">UTC</small></span><div className="calendar-peek__when"><input type="date" min={dayOf(peek.startAt)} value={peek.endAt ? dayOf(peek.endAt) : ""} onChange={(event) => setPeek({ ...peek, endAt: event.target.value ? `${event.target.value}T${peek.endAt ? timeOf(peek.endAt) : timeOf(peek.startAt)}` : null })} />{!(peek.allDay ?? true) && peek.endAt && <input type="time" value={timeOf(peek.endAt)} onChange={(event) => setPeek({ ...peek, endAt: `${dayOf(peek.endAt || peek.startAt)}T${event.target.value || "11:00"}` })} />}{peek.endAt && <button type="button" className="calendar-inline-link" onClick={() => setPeek({ ...peek, endAt: null })}>Quitar</button>}</div>
          <span>Color</span><div className="calendar-modal__colors">{colors.map((color) => <button type="button" key={color} className={`calendar-color calendar-color--${color} ${(peek.color || "acid") === color ? "is-active" : ""}`} onClick={() => setPeek({ ...peek, color })} aria-label={`Color ${color}`} />)}</div>
        </div>
        {!(peek.allDay ?? true) && <LocalTimeLine start={peek.startAt} end={peek.endAt ?? null} />}
        <textarea className="calendar-peek__notes" value={peek.description || ""} onChange={(event) => setPeek({ ...peek, description: event.target.value })} placeholder="Añade notas para el equipo…" rows={8} />
      </fieldset>
      {!readOnly && <div className="calendar-peek__actions"><button className="admin-secondary" type="button" onClick={() => setPeek(null)}>Descartar</button><button className="admin-primary" type="button" disabled={saving || !peek.title?.trim()} onClick={() => void savePeek()}>{saving ? "Guardando…" : peek.id ? "Guardar" : "Crear evento"}</button></div>}
      <p className="calendar-peek__hint">{longDay(dayOf(peek.startAt))}{peek.endAt && dayOf(peek.endAt) !== dayOf(peek.startAt) ? ` → ${longDay(dayOf(peek.endAt))}` : ""}</p>
    </aside></div>, document.body)}
  </section>;
}


/** En la ficha: la hora UTC elegida convertida en directo a la hora local de quien la edita. */
function LocalTimeLine({ start, end }: { start: string; end: string | null }) {
  const from = describeLocal(start);
  const to = end ? describeLocal(end) : null;
  if (from.isUtc && (!to || to.isUtc)) return <p className="calendar-local-line">Tu zona ya es UTC: la hora que escribes es tu hora.</p>;
  return <p className="calendar-local-line"><span>En tu hora</span><strong>{from.sameDay ? "" : `${from.day}, `}{from.time}{to ? ` → ${to.localDay === from.localDay ? "" : `${to.day}, `}${to.time}` : ""}</strong><small>{from.zone}{to && to.zone !== from.zone ? ` → ${to.zone}` : ""}</small></p>;
}
