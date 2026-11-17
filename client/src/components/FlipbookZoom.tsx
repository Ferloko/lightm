import { Minus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE_LIMIT = 4;
const STEP = 1.6;

type View = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

/**
 * Vista de zoom del lector: pellizcar, rueda del ratón, doble toque y arrastrar.
 * Sustituye al zoom del navegador, que se peleaba con el paso de página.
 */
export default function FlipbookZoom({ sources, label, onClose }: { sources: string[]; label: string; onClose: () => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Hasta un poco más de la resolución real de la imagen: más allá solo se pixela.
  const [maxScale, setMaxScale] = useState(2.5);
  const maxScaleRef = useRef(maxScale);
  maxScaleRef.current = maxScale;
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [animated, setAnimated] = useState(true);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ start: View; origin: Point; distance: number } | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);

  const clamp = useCallback((next: View): View => {
    const box = viewportRef.current?.getBoundingClientRect();
    const scale = Math.min(maxScaleRef.current, Math.max(MIN_SCALE, next.scale));
    if (!box) return { scale, x: 0, y: 0 };
    const maxX = ((scale - 1) * box.width) / 2;
    const maxY = ((scale - 1) * box.height) / 2;
    return { scale, x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
  }, []);

  /** Punto de la pantalla relativo al centro del visor. */
  const toCenter = (clientX: number, clientY: number): Point => {
    const box = viewportRef.current?.getBoundingClientRect();
    return box ? { x: clientX - box.left - box.width / 2, y: clientY - box.top - box.height / 2 } : { x: 0, y: 0 };
  };

  /** Cambia la escala manteniendo fijo el punto `focus`. */
  const zoomAround = useCallback((base: View, scale: number, focus: Point): View => {
    const target = Math.min(maxScaleRef.current, Math.max(MIN_SCALE, scale));
    const ratio = target / base.scale;
    return clamp({ scale: target, x: focus.x - (focus.x - base.x) * ratio, y: focus.y - (focus.y - base.y) * ratio });
  }, [clamp]);

  const zoomBy = (factor: number) => { setAnimated(true); setView((current) => zoomAround(current, current.scale * factor, { x: 0, y: 0 })); };

  const measureMaxScale = useCallback(() => {
    const image = contentRef.current?.querySelector("img");
    if (!image || !image.naturalHeight || !image.clientHeight) return;
    const native = (image.naturalHeight / image.clientHeight) * 1.35;
    setMaxScale(Math.min(MAX_SCALE_LIMIT, Math.max(1.5, native)));
  }, []);

  useEffect(() => {
    window.addEventListener("resize", measureMaxScale);
    return () => window.removeEventListener("resize", measureMaxScale);
  }, [measureMaxScale]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setAnimated(false);
      const focus = toCenter(event.clientX, event.clientY);
      setView((current) => zoomAround(current, current.scale * Math.exp(-event.deltaY * 0.0022), focus));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomAround]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      if (event.key === "+" || event.key === "=") zoomBy(STEP);
      if (event.key === "-") zoomBy(1 / STEP);
    };
    window.addEventListener("keydown", onKey, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey, true); document.body.style.overflow = previous; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const beginGesture = () => {
    const points = [...pointers.current.values()];
    if (points.length >= 2) {
      const [a, b] = points;
      gesture.current = { start: viewRef.current, origin: toCenter((a.x + b.x) / 2, (a.y + b.y) / 2), distance: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
    } else if (points.length === 1) {
      gesture.current = { start: viewRef.current, origin: points[0], distance: 0 };
    } else {
      gesture.current = null;
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setAnimated(false);
    beginGesture();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    const { start, origin, distance } = gesture.current;
    if (points.length >= 2) {
      const [a, b] = points;
      const center = toCenter((a.x + b.x) / 2, (a.y + b.y) / 2);
      const zoomed = zoomAround(start, start.scale * (Math.hypot(a.x - b.x, a.y - b.y) / distance), origin);
      setView(clamp({ ...zoomed, x: zoomed.x + center.x - origin.x, y: zoomed.y + center.y - origin.y }));
    } else if (start.scale > 1) {
      setView(clamp({ ...start, x: start.x + event.clientX - origin.x, y: start.y + event.clientY - origin.y }));
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const wasSingle = pointers.current.size === 1;
    const startPoint = gesture.current?.origin;
    pointers.current.delete(event.pointerId);
    beginGesture();
    if (!wasSingle || !startPoint) return;
    const moved = Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > 8;
    if (moved) { lastTap.current = null; return; }
    const now = performance.now();
    const point = { x: event.clientX, y: event.clientY };
    const previous = lastTap.current;
    if (previous && now - previous.time < 320 && Math.hypot(point.x - previous.point.x, point.y - previous.point.y) < 30) {
      lastTap.current = null;
      setAnimated(true);
      setView((current) => current.scale > 1.05 ? { scale: 1, x: 0, y: 0 } : zoomAround(current, Math.min(2.5, maxScaleRef.current), toCenter(point.x, point.y)));
    } else {
      lastTap.current = { time: now, point };
    }
  };

  const percent = Math.round(view.scale * 100);

  return <div className="flipbook-zoom" role="dialog" aria-modal="true" aria-label={`Zoom: ${label}`}>
    <div className="flipbook-zoom__bar">
      <span className="flipbook-zoom__label">{label}</span>
      <div className="flipbook-zoom__tools">
        <button type="button" onClick={() => zoomBy(1 / STEP)} disabled={view.scale <= MIN_SCALE} aria-label="Alejar"><Minus size={16} /></button>
        <button type="button" className="flipbook-zoom__percent" onClick={() => { setAnimated(true); setView({ scale: 1, x: 0, y: 0 }); }} aria-label="Ajustar a la pantalla">{percent}%</button>
        <button type="button" onClick={() => zoomBy(STEP)} disabled={view.scale >= maxScale - 0.01} aria-label="Acercar"><Plus size={16} /></button>
        <button type="button" className="flipbook-zoom__close" onClick={onClose} aria-label="Cerrar zoom"><X size={18} /></button>
      </div>
    </div>
    <div
      className={`flipbook-zoom__viewport${view.scale > 1 ? " is-zoomed" : ""}`}
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        ref={contentRef}
        className={`flipbook-zoom__content${animated ? " is-animated" : ""}`}
        style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
      >
        {sources.map((src, index) => <img key={src} src={src} alt={`${label}, página ${index + 1}`} draggable={false} onLoad={measureMaxScale} style={{ maxWidth: `${100 / sources.length}%` }} />)}
      </div>
    </div>
    <p className="flipbook-zoom__hint">Pellizca, usa la rueda o toca dos veces para acercar. Arrastra para moverte.</p>
  </div>;
}
