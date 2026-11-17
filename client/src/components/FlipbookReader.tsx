import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PageFlip } from "page-flip";
import type { Flipbook } from "@/lib/flipbook";

/**
 * Lector con paso de página para las ediciones que tienen lector propio.
 * page-flip mueve los nodos del DOM, así que las páginas se crean fuera de React.
 */
export default function FlipbookReader({ flipbook, title }: { flipbook: Flipbook; title: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const [index, setIndex] = useState(0);
  const [portrait, setPortrait] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const total = flipbook.pages.length;
  const ratio = flipbook.width && flipbook.height ? flipbook.width / flipbook.height : 0.707;

  // Ancho máximo del libro para que quepa en el alto disponible.
  useEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return;
    const fit = () => {
      const narrow = frame.clientWidth < 640;
      const availableHeight = Math.max(240, frame.clientHeight - 32);
      stage.style.maxWidth = `${Math.floor(availableHeight * ratio * (narrow ? 1 : 2))}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [ratio]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    const book = document.createElement("div");
    stage.appendChild(book);
    flipbook.pages.forEach((src, pageIndex) => {
      const page = document.createElement("div");
      page.className = "flipbook-page";
      if (pageIndex === 0 || pageIndex === total - 1) page.dataset.density = "hard";
      const image = document.createElement("img");
      image.src = src;
      image.alt = `Página ${pageIndex + 1} de ${title}`;
      image.draggable = false;
      image.loading = pageIndex < 4 ? "eager" : "lazy";
      image.decoding = "async";
      page.appendChild(image);
      book.appendChild(page);
    });
    import("page-flip").then(({ PageFlip }) => {
      if (cancelled) return;
      const width = flipbook.width || 1131;
      const height = flipbook.height || 1600;
      const flip = new PageFlip(book, {
        width, height, size: "stretch",
        minWidth: 280, maxWidth: width, minHeight: Math.round(280 / ratio), maxHeight: height,
        showCover: true, usePortrait: true, mobileScrollSupport: false,
        maxShadowOpacity: 0.35, flippingTime: 650,
      });
      flip.loadFromHTML(book.querySelectorAll<HTMLElement>(".flipbook-page"));
      flip.on<number>("flip", (event) => setIndex(event.data));
      flip.on<"portrait" | "landscape">("changeOrientation", (event) => setPortrait(event.data === "portrait"));
      setPortrait(flip.getOrientation() === "portrait");
      flipRef.current = flip;
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      try { flipRef.current?.destroy(); } catch { /* ya desmontado */ }
      flipRef.current = null;
      stage.innerHTML = "";
    };
  }, [flipbook, ratio, title, total]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") flipRef.current?.flipNext();
      if (event.key === "ArrowLeft") flipRef.current?.flipPrev();
    };
    const onFullscreen = () => setFullscreen(document.fullscreenElement === frameRef.current?.parentElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFullscreen); };
  }, []);

  const toggleFullscreen = () => {
    const root = frameRef.current?.parentElement;
    if (!root) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void root.requestFullscreen?.().catch(() => undefined);
  };

  const label = !portrait && index > 0 && index < total - 1 ? `${index + 1}–${Math.min(index + 2, total)} / ${total}` : `${index + 1} / ${total}`;

  return <div className="flipbook-reader">
    <div className="flipbook-reader__frame" ref={frameRef}>
      {failed ? <p className="flipbook-reader__error">No se pudo cargar el lector. Recarga la página.</p> : <div className="flipbook-reader__stage" ref={stageRef} />}
    </div>
    <div className="flipbook-reader__controls">
      <button type="button" onClick={() => flipRef.current?.flipPrev()} disabled={index === 0} aria-label="Página anterior"><ChevronLeft size={18} /></button>
      <span aria-live="polite">{label}</span>
      <button type="button" onClick={() => flipRef.current?.flipNext()} disabled={index >= total - 1} aria-label="Página siguiente"><ChevronRight size={18} /></button>
      <button type="button" className="flipbook-reader__fullscreen" onClick={toggleFullscreen} aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
    </div>
  </div>;
}
