import { Maximize2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";

/** Los enlaces y botones de la página no hacen nada dentro de la vista previa. */
const block = (event: SyntheticEvent) => { event.preventDefault(); event.stopPropagation(); };

/**
 * Vista previa de una página pública dentro del Dashboard: la página real (mismos componentes y
 * estilos) a ancho de escritorio, reducida para caber en el panel y actualizada mientras se escribe.
 * “Pantalla completa” la abre a tamaño real, como la vista previa limpia de los artículos.
 */
export default function PagePreview({ children, width = 1280, tabs, onPick, active, label = "Vista previa en vivo" }: { children: ReactNode; width?: number; tabs?: ReactNode; onPick?: (field: string, element: HTMLElement) => void; active?: string | null; label?: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(0);
  const [full, setFull] = useState(false);

  useLayoutEffect(() => {
    const outer = viewport.current, inner = canvas.current;
    if (!outer || !inner) return;
    const measure = () => { setScale(Math.min(1, outer.clientWidth / width)); setHeight(inner.offsetHeight); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer); observer.observe(inner);
    return () => observer.disconnect();
  }, [width]);

  /** Con onPick, un clic sobre algo marcado con data-edit-field lo abre para editarlo ahí mismo. */
  const pick = (event: SyntheticEvent) => {
    block(event);
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-edit-field]");
    if (target && onPick) onPick(target.dataset.editField!, target);
  };
  const editable = onPick ? " page-preview--editable" : "";

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); setFull(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [full]);

  return <div className={`page-preview${editable}`}>
    <div className="page-preview__bar">
      <span className="clean-preview__label"><i /> {label}</span>
      {tabs}
      <button type="button" onClick={() => setFull(true)}><Maximize2 size={13} /> Pantalla completa</button>
    </div>
    <div className="page-preview__viewport" ref={viewport} style={{ height: height * scale || undefined }}>
      <div className="page-preview__canvas" ref={canvas} style={{ width, transform: `scale(${scale})` }} onClickCapture={pick} data-active-field={active || undefined} aria-hidden={onPick ? undefined : true}>{children}</div>
    </div>
    {full && createPortal(<div className={`clean-preview${editable}`} role="dialog" aria-modal="true" aria-label="Vista previa a pantalla completa">
      <div className="clean-preview__bar">
        <span className="clean-preview__label"><i /> Vista previa · así se verá publicada</span>
        <button type="button" className="clean-preview__close" onClick={() => setFull(false)} title="Cerrar (Esc)"><X size={18} /> Volver al editor</button>
      </div>
      <div className="clean-preview__site page-preview__full" onClickCapture={pick} data-active-field={active || undefined}>{children}</div>
    </div>, document.body)}
  </div>;
}

/** La página a pantalla completa, sin edición: “así se verá publicada”. Se cierra con Esc. */
export function FullscreenPreview({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return createPortal(<div className="clean-preview" role="dialog" aria-modal="true" aria-label="Vista previa a pantalla completa">
    <div className="clean-preview__bar">
      <span className="clean-preview__label"><i /> Vista previa · así se verá publicada</span>
      <button type="button" className="clean-preview__close" onClick={onClose} title="Cerrar (Esc)"><X size={18} /> Volver al editor</button>
    </div>
    <div className="clean-preview__site page-preview__full" onClickCapture={block}>{children}</div>
  </div>, document.body);
}

/** Dentro de un editor en su sitio, los enlaces de la página no navegan. */
export const keepLinksInPlace = (event: SyntheticEvent) => { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); };
