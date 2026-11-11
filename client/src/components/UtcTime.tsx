import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { utcWallToDate } from "@/lib/calendar";

const viewerZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();

/** Zona del visitante, legible: "GMT-3 · Buenos Aires". */
export function localZoneLabel(date = new Date()) {
  let offset = "";
  try { offset = new Intl.DateTimeFormat("es-ES", { timeZone: viewerZone, timeZoneName: "shortOffset" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value || ""; } catch { /* old browsers */ }
  const city = viewerZone.split("/").pop()?.replace(/_/g, " ") || viewerZone;
  return offset ? `${offset} · ${city}` : city;
}

/** Hora local del visitante para una hora UTC ("YYYY-MM-DDTHH:mm"), con la fecha si cambia de día. */
export function describeLocal(wall: string) {
  const date = utcWallToDate(wall);
  const time = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const localDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; // YYYY-MM-DD local
  const sameDay = localDay === wall.slice(0, 10);
  const day = date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
  return { time, day, localDay, sameDay, zone: localZoneLabel(date), isUtc: date.getTimezoneOffset() === 0 };
}

/**
 * Una hora UTC del calendario. Al pasar el ratón (o al enfocar/tocar) muestra, resaltada,
 * la hora en el país del visitante. La burbuja va en un portal para que no la recorte la celda.
 */
export default function UtcTime({ value, className = "", showUtcBadge = false }: { value: string; className?: string; showUtcBadge?: boolean }) {
  const ref = useRef<HTMLTimeElement>(null);
  const touchedAt = useRef(0);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  // Tras un toque, el navegador simula ratón y foco: se ignoran un momento para que no cierren la burbuja.
  const justTouched = () => Date.now() - touchedAt.current < 800;
  const open = () => { if (!justTouched() && ref.current) setAnchor(ref.current.getBoundingClientRect()); };
  const close = () => { if (!justTouched()) setAnchor(null); };
  const toggleByTouch = () => { touchedAt.current = Date.now(); setAnchor((current) => current ? null : ref.current?.getBoundingClientRect() || null); };
  useEffect(() => {
    if (!anchor) return;
    const hide = () => { if (!justTouched()) setAnchor(null); };
    const outside = (event: TouchEvent) => { if (!ref.current?.contains(event.target as Node)) setAnchor(null); };
    window.addEventListener("scroll", hide, true);
    document.addEventListener("touchstart", outside, true);
    return () => { window.removeEventListener("scroll", hide, true); document.removeEventListener("touchstart", outside, true); };
  }, [anchor]);
  const utc = value.slice(11, 16) || "00:00";
  const local = describeLocal(value);
  const label = `${utc} UTC · tu hora: ${local.sameDay ? "" : `${local.day}, `}${local.time} (${local.zone})`;
  return <>
    <time ref={ref} className={`utc-time ${className}`} dateTime={`${value}:00Z`} tabIndex={0} aria-label={label} onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close} onTouchStart={(event) => { event.stopPropagation(); toggleByTouch(); }} onClick={(event) => { if (!justTouched()) return; event.preventDefault(); event.stopPropagation(); }}>
      {utc}{showUtcBadge && <small> UTC</small>}
    </time>
    {anchor && typeof document !== "undefined" && createPortal(<span className={`utc-time__bubble${anchor.top < 110 ? " is-below" : ""}`} role="tooltip" style={{ left: Math.min(Math.max(90, anchor.left + anchor.width / 2), window.innerWidth - 90), top: anchor.top < 110 ? anchor.bottom + 8 : anchor.top - 8 }}>
      <span className="utc-time__label">Tu hora</span>
      <strong>{local.time}</strong>
      {!local.sameDay && <em>{local.day}</em>}
      <span className="utc-time__zone">{local.zone}</span>
      <span className="utc-time__utc">{utc} UTC</span>
    </span>, document.body)}
  </>;
}
