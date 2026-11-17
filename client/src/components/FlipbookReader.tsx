import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { PageFlip } from "page-flip";
import type { Flipbook } from "@/lib/flipbook";

const FlipbookZoom = lazy(() => import("@/components/FlipbookZoom"));

/** Páginas que se cargan por delante y por detrás de la actual. */
const PRELOAD_AHEAD = 6;
const PRELOAD_BEHIND = 2;
const FLIP_TIME = 800;

/**
 * Lector con paso de página para las ediciones que tienen lector propio.
 * page-flip mueve los nodos del DOM, así que las páginas se crean fuera de React.
 */
export default function FlipbookReader({ flipbook, title }: { flipbook: Flipbook; title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const zoomOpenRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [landscape, setLandscape] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const total = flipbook.pages.length;
  const ratio = flipbook.width && flipbook.height ? flipbook.width / flipbook.height : 0.707;
  zoomOpenRef.current = zoomOpen;

  /** Pide y decodifica las páginas cercanas para que no aparezcan en blanco al pasar. */
  const preload = useCallback((center: number) => {
    const images = imagesRef.current;
    const jobs: Promise<void>[] = [];
    for (let page = Math.max(0, center - PRELOAD_BEHIND); page <= Math.min(images.length - 1, center + PRELOAD_AHEAD); page += 1) {
      const image = images[page];
      if (image.dataset.state) continue;
      image.dataset.state = "loading";
      image.src = flipbook.pages[page];
      jobs.push(image.decode().catch(() => undefined).then(() => {
        image.dataset.state = "ready";
        image.parentElement?.classList.add("is-ready");
      }));
    }
    return Promise.all(jobs);
  }, [flipbook.pages]);

  // Ancho máximo del libro para que quepa en el alto disponible.
  useEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return;
    const fit = () => {
      const style = getComputedStyle(frame);
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const narrow = frame.clientWidth < 640;
      const availableHeight = Math.max(240, frame.clientHeight - padY);
      const availableWidth = Math.max(200, frame.clientWidth - padX);
      stage.style.width = `${Math.floor(Math.min(availableWidth, availableHeight * ratio * (narrow ? 1 : 2)))}px`;
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
    setReady(false);
    setIndex(0);
    const book = document.createElement("div");
    stage.appendChild(book);
    imagesRef.current = flipbook.pages.map((_, pageIndex) => {
      const page = document.createElement("div");
      page.className = "flipbook-page";
      if (pageIndex === 0 || pageIndex === total - 1) page.dataset.density = "hard";
      const image = document.createElement("img");
      image.alt = `Página ${pageIndex + 1} de ${title}`;
      image.draggable = false;
      image.decoding = "async";
      page.appendChild(image);
      book.appendChild(page);
      return image;
    });

    // Espera a que la portada y las primeras páginas estén listas (máximo 5 s).
    const firstPages = preload(0);
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 5000));
    Promise.all([import("page-flip"), Promise.race([firstPages, timeout])]).then(([{ PageFlip }]) => {
      if (cancelled) return;
      const width = flipbook.width || 1131;
      const height = flipbook.height || 1600;
      const flip = new PageFlip(book, {
        width, height, size: "stretch",
        minWidth: 280, maxWidth: width, minHeight: Math.round(280 / ratio), maxHeight: height,
        showCover: true, usePortrait: true, mobileScrollSupport: false,
        maxShadowOpacity: 0.28, flippingTime: FLIP_TIME, swipeDistance: 24,
        disableFlipByClick: true, showPageCorners: true,
      });
      flip.loadFromHTML(book.querySelectorAll<HTMLElement>(".flipbook-page"));
      flip.on<number>("flip", (event) => { setIndex(event.data); void preload(event.data); });
      flip.on<"portrait" | "landscape">("changeOrientation", (event) => setLandscape(event.data === "landscape"));
      flip.on<string>("changeState", (event) => {
        // Al empezar a arrastrar, adelanta la carga en ambas direcciones.
        if (event.data === "user_fold" || event.data === "flipping") void preload(flip.getCurrentPageIndex() + 2);
      });
      setLandscape(flip.getOrientation() === "landscape");
      flipRef.current = flip;
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      try { flipRef.current?.destroy(); } catch { /* ya desmontado */ }
      flipRef.current = null;
      imagesRef.current = [];
      stage.innerHTML = "";
    };
  }, [flipbook, preload, ratio, title, total]);

  const goNext = useCallback(() => { if (!zoomOpenRef.current) flipRef.current?.flipNext(); }, []);
  const goPrev = useCallback(() => { if (!zoomOpenRef.current) flipRef.current?.flipPrev(); }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select") || zoomOpenRef.current) return;
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };
    const onFullscreen = () => setFullscreen(document.fullscreenElement === rootRef.current);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFullscreen); };
  }, [goNext, goPrev]);

  const toggleFullscreen = () => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void root.requestFullscreen?.().catch(() => undefined);
  };

  const jumpTo = (page: number) => {
    const flip = flipRef.current;
    if (!flip) return;
    void preload(page);
    flip.turnToPage(page);
    setIndex(flip.getCurrentPageIndex());
  };

  // En doble página, la portada y la contraportada sueltas se centran.
  const aloneRight = landscape && index === 0;
  const aloneLeft = landscape && total > 1 && total % 2 === 0 && index === total - 1;
  const shift = aloneRight ? "-25%" : aloneLeft ? "25%" : "0%";
  const visible = landscape && index > 0 && index < total - 1 ? [index, index + 1] : [index];
  const label = visible.length === 2 ? `${index + 1}–${index + 2}` : `${index + 1}`;

  return <div className={`flipbook-reader${fullscreen ? " is-fullscreen" : ""}`} ref={rootRef}>
    <div className="flipbook-reader__frame" ref={frameRef} onDoubleClick={() => ready && setZoomOpen(true)}>
      {failed ? <p className="flipbook-reader__status">No se pudo cargar el lector. Recarga la página.</p> : <>
        {!ready && <div className="flipbook-reader__status" role="status"><span className="flipbook-reader__spinner" />Cargando edición…</div>}
        <div className={`flipbook-reader__book${ready ? " is-ready" : ""}`} style={{ transform: `translate3d(${shift}, 0, 0)` }}>
          <div className="flipbook-reader__stage" ref={stageRef} />
        </div>
      </>}
    </div>
    <div className="flipbook-reader__controls">
      <button type="button" onClick={goPrev} disabled={!ready || index === 0} aria-label="Página anterior"><ChevronLeft size={18} /></button>
      <div className="flipbook-reader__progress">
        <input type="range" min={1} max={total} value={index + 1} onChange={(event) => jumpTo(Number(event.target.value) - 1)} disabled={!ready} aria-label="Ir a la página" style={{ "--progress": `${total > 1 ? (index / (total - 1)) * 100 : 100}%` } as React.CSSProperties} />
        <span aria-live="polite">{label} <small>/ {total}</small></span>
      </div>
      <button type="button" onClick={goNext} disabled={!ready || visible[visible.length - 1] >= total - 1} aria-label="Página siguiente"><ChevronRight size={18} /></button>
      <span className="flipbook-reader__divider" aria-hidden="true" />
      <button type="button" onClick={() => setZoomOpen(true)} disabled={!ready} aria-label="Ampliar página"><ZoomIn size={17} /></button>
      <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
    </div>
    {zoomOpen && <Suspense fallback={null}>
      <FlipbookZoom sources={visible.map((page) => flipbook.pages[page])} label={`${title} · página ${label}`} onClose={() => setZoomOpen(false)} />
    </Suspense>}
  </div>;
}
