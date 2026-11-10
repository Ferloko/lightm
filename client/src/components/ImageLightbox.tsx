import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type LightboxImage = { src: string; alt: string; caption?: string };

/** Full-screen image viewer: arrows, keyboard (Esc, ←, →), swipe, thumbnails, click outside to close. */
export default function ImageLightbox({ images, index, onIndexChange, onClose }: { images: LightboxImage[]; index: number; onIndexChange: (index: number) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const count = images.length;
  const current = images[index];
  const go = (step: number) => { if (count > 1) onIndexChange((index + step + count) % count); };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus?.({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });
  // New image: show the loading state and preload the neighbours so moving through the book feels instant.
  useEffect(() => {
    setLoaded(false);
    [index + 1, index - 1].forEach((neighbour) => { const item = images[(neighbour + count) % count]; if (item) { const image = new Image(); image.src = item.src; } });
  }, [index, images, count]);

  if (!current) return null;
  return createPortal(<div className="lightbox" role="dialog" aria-modal="true" aria-label="Visor de imágenes" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="lightbox__bar">
      <span className="lightbox__count">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
      <button ref={closeRef} type="button" className="lightbox__close" onClick={onClose} aria-label="Cerrar visor" title="Cerrar (Esc)"><X size={20} strokeWidth={1.4} /></button>
    </div>
    <div className="lightbox__stage" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onPointerDown={(event) => { swipeStart.current = event.clientX; }}
      onPointerUp={(event) => { if (swipeStart.current === null) return; const delta = event.clientX - swipeStart.current; swipeStart.current = null; if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1); }}>
      {count > 1 && <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label="Imagen anterior"><ChevronLeft size={26} strokeWidth={1.2} /></button>}
      <figure className="lightbox__figure" key={current.src}>
        <img className={loaded ? "is-loaded" : ""} src={current.src} alt={current.alt} draggable={false} onLoad={() => setLoaded(true)} />
        {!loaded && <span className="lightbox__loading" aria-hidden="true" />}
        {current.caption && <figcaption>{current.caption}</figcaption>}
      </figure>
      {count > 1 && <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label="Imagen siguiente"><ChevronRight size={26} strokeWidth={1.2} /></button>}
    </div>
    {count > 1 && <div className="lightbox__thumbs" role="tablist" aria-label="Miniaturas">{images.map((image, thumbIndex) => <button type="button" role="tab" aria-selected={thumbIndex === index} key={`${image.src}-${thumbIndex}`} className={thumbIndex === index ? "is-active" : ""} onClick={() => onIndexChange(thumbIndex)} aria-label={`Ver imagen ${thumbIndex + 1}`}><img src={image.src} alt="" loading="lazy" /></button>)}</div>}
  </div>, document.body);
}
