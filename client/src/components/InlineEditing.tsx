import { Image, ImageOff, ImagePlus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Piezas para editar "sobre la vista previa": el texto y las imágenes se cambian
 * directamente en el diseño final, con su tipografía real.
 */

/** Image frame with its URL built in: click the frame to paste or change the link. Warns when the URL cannot be loaded. */
export function ImageUrlFrame({ src, onChange, className, emptyLabel, readOnly = false }: { src: string; onChange: (url: string) => void; className: string; emptyLabel: string; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(src);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setFailed(false), [src]);
  useEffect(() => { if (editing) { setDraft(src); inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => { const url = draft.trim(); if (url !== src) onChange(url); setEditing(false); };
  const hasImage = Boolean(src) && !failed;
  return <div className={`${className} image-url-frame${editing ? " is-editing" : ""}${hasImage ? " has-image" : ""}${failed ? " is-broken" : ""}`}>
    <button type="button" className="image-url-frame__trigger" onClick={() => { if (!readOnly) setEditing(true); }} disabled={readOnly && !src} aria-label={src ? "Cambiar imagen" : "Añadir imagen"}>
      {hasImage ? <img src={src} alt="" onError={() => setFailed(true)} /> : <span className="image-url-frame__empty">{failed ? <><ImageOff size={24} /><span>No se pudo cargar la imagen. Haz clic y revisa que la URL sea directa (.jpg, .png, .webp).</span></> : <><Image size={24} /><span>{emptyLabel}</span></>}</span>}
      {hasImage && !editing && !readOnly && <span className="image-url-frame__badge">Cambiar imagen</span>}
    </button>
    {editing && <form className="image-url-frame__form" onSubmit={(event) => { event.preventDefault(); commit(); }}>
      <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setEditing(false); } }} placeholder="Pega la URL de la imagen: https://…" aria-label="URL de imagen" />
      <button type="submit" onMouseDown={(event) => event.preventDefault()}>Listo</button>
    </form>}
  </div>;
}
/** Botón con un pequeño formulario flotante para cambiar una imagen de fondo sin tapar el diseño. */
export function ImageUrlButton({ src, onChange, label = "Imagen", className = "", readOnly = false }: { src: string; onChange: (url: string) => void; label?: string; className?: string; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(src);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setDraft(src); inputRef.current?.focus(); inputRef.current?.select(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (readOnly) return null;
  const commit = () => { const url = draft.trim(); if (url !== src) onChange(url); setOpen(false); };
  return <div className={`image-url-button ${className}`}>
    <button type="button" className="image-url-button__toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}><ImagePlus size={14} /> {src ? `Cambiar ${label.toLowerCase()}` : `Añadir ${label.toLowerCase()}`}</button>
    {open && <form className="image-url-button__form" onSubmit={(event) => { event.preventDefault(); commit(); }}>
      <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); } }} placeholder="https://…" aria-label={`URL de ${label.toLowerCase()}`} />
      <button type="submit">Listo</button>
      {src && <button type="button" className="image-url-button__clear" onClick={() => { onChange(""); setOpen(false); }}>Quitar</button>}
    </form>}
  </div>;
}

/**
 * Texto editable en su sitio: hereda la tipografía del diseño (título, bajada, cita…).
 * Con multiline crece con el contenido; Enter confirma en una sola línea.
 */
export function InlineText({ value, onChange, placeholder, multiline = false, className = "", readOnly = false, ariaLabel, style }: { value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; className?: string; readOnly?: boolean; ariaLabel?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => { element.style.height = "0px"; element.style.height = `${element.scrollHeight}px`; };
    fit();
    // También al cambiar el ancho (vista móvil/ordenador, ventana).
    if (typeof ResizeObserver === "undefined") return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => { if (element.clientWidth !== width) { width = element.clientWidth; fit(); } });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, multiline]);
  if (multiline) return <textarea ref={ref} className={`inline-text ${className}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} readOnly={readOnly} aria-label={ariaLabel || placeholder} rows={1} style={style} />;
  return <input className={`inline-text ${className}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} readOnly={readOnly} aria-label={ariaLabel || placeholder} size={Math.max(4, (value || placeholder || "").length + 1)} style={style} onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }} />;
}

