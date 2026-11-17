import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const WIDTH = 340;

/**
 * Recuadro de edición junto al elemento que se pulsó en la vista previa: sigue al elemento si se
 * desplaza la página y se cierra con Esc, con “Listo” o al hacer clic fuera.
 */
export default function EditPopover({ anchor, title, onClose, children }: { anchor: HTMLElement; title: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    const place = () => {
      frame = 0;
      const rect = anchor.getBoundingClientRect();
      const height = box.current?.offsetHeight || 220;
      const below = rect.bottom + 10;
      const top = below + height < window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 10);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - WIDTH - 12);
      setPosition({ top, left });
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(place); };
    place();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("scroll", schedule, true); window.removeEventListener("resize", schedule); if (frame) window.cancelAnimationFrame(frame); };
  }, [anchor]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const onDown = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) onClose(); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown, true);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown, true); };
  }, [onClose]);

  return createPortal(<div ref={box} className="edit-popover" role="dialog" aria-label={title} style={{ width: WIDTH, top: position?.top ?? -9999, left: position?.left ?? -9999 }}>
    <header><span>{title}</span><button type="button" onClick={onClose} aria-label="Cerrar"><X size={14} /></button></header>
    <div className="edit-popover__body">{children}</div>
  </div>, document.body);
}
