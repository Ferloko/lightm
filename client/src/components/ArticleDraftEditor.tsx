import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowUp, Copy, Image, ImageOff, LayoutGrid, Minus, Quote, Save, Trash2, Type, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, PointerEvent, TextareaHTMLAttributes } from "react";
import type { EditorialArticle } from "@/lib/editorial";
import type { GridLayout, PageBlock, PageBlockType } from "@/lib/pageBlocks";
import CleanArticlePreview from "@/components/CleanArticlePreview";

type Props = { article: EditorialArticle; canPublish: boolean; notice: string; onChange: (patch: Partial<EditorialArticle>) => void; onSaveDraft: () => void; onPublish: () => void; onBack: () => void };
type GridColumn = "left" | "right";

const WORDS_PER_MINUTE = 220;
const placeholders: Partial<Record<PageBlockType, string>> = { heading: "Escribe un subtítulo…", paragraph: "Escribe el siguiente párrafo de tu historia…", quote: "Una frase que merece espacio…" };

function AutoResizeTextarea({ value, onChange, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const element = ref.current; if (!element) return; element.style.height = "auto"; element.style.height = `${element.scrollHeight}px`; }, [value]);
  return <textarea ref={ref} value={value} onChange={onChange} className={className} {...props} />;
}

/** Image preview that tells the editor when a URL cannot be loaded instead of showing a broken icon. */
function DraftImage({ src, className, empty }: { src: string; className: string; empty: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <div className={`${className}${failed ? " is-broken" : ""}`}>{src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : failed ? <><ImageOff size={22} /><span>No se pudo cargar la imagen. Revisa que la URL sea directa (.jpg, .png, .webp).</span></> : <><Image size={22} /><span>{empty}</span></>}</div>;
}

function blockLabel(block: PageBlock) { return block.type === "paragraph" ? "Párrafo" : block.type === "heading" ? "Subtítulo" : block.type === "image" ? "Imagen" : block.type === "quote" ? "Cita" : block.type === "divider" ? "Separador" : block.type === "grid" ? "Cuadrícula" : "Botón"; }
function countWords(article: EditorialArticle) { const text = [article.title, article.excerpt, article.lead, ...article.blocks.filter((block) => ["paragraph", "heading", "quote"].includes(block.type)).map((block) => block.content)].join(" "); return (text.match(/[\p{L}\p{N}’']+/gu) || []).length; }
function useEscape(onEscape: () => void, active = true) { useEffect(() => { if (!active) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onEscape(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onEscape, active]); }

export default function ArticleDraftEditor({ article, canPublish, notice, onChange, onSaveDraft, onPublish, onBack }: Props) {
  const [gridDialogOpen, setGridDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);

  // Unsaved changes: compare against the last saved version (a save always stamps a new updatedAt).
  const snapshot = (value: EditorialArticle) => JSON.stringify({ ...value, updatedAt: "" });
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(article));
  useEffect(() => { setSavedSnapshot(snapshot(article)); }, [article.id, article.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = snapshot(article) !== savedSnapshot;
  const words = countWords(article);
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

  // Ctrl/Cmd + S saves the draft; closing the tab with unsaved changes asks first.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); onSaveDraft(); } };
    const onUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("keydown", onKey); window.addEventListener("beforeunload", onUnload);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onUnload); };
  }, [dirty, onSaveDraft]);
  // Newly added blocks scroll into view and receive focus.
  useEffect(() => {
    if (!focusBlockId) return;
    const frame = window.requestAnimationFrame(() => { const element = editorRef.current?.querySelector<HTMLElement>(`[data-block-id="${focusBlockId}"]`); element?.scrollIntoView({ behavior: "smooth", block: "center" }); element?.querySelector<HTMLElement>("textarea, input")?.focus({ preventScroll: true }); setFocusBlockId(null); });
    return () => window.cancelAnimationFrame(frame);
  }, [focusBlockId, article.blocks]);
  useEscape(() => setGridDialogOpen(false), gridDialogOpen);

  const leave = () => { if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Salir de todos modos?")) return; onBack(); };
  const updateBlock = (id: string, patch: Partial<PageBlock>) => onChange({ blocks: article.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  const insertBlock = (block: PageBlock) => { onChange({ blocks: [...article.blocks, block] }); setFocusBlockId(block.id); };
  const addBlock = (type: PageBlockType) => insertBlock({ id: `${type}-${Date.now()}`, type, x: 0, y: 0, width: 780, height: type === "image" ? 360 : 90, content: "", caption: "", imageAlign: type === "image" ? "full" : undefined, fontSize: type === "heading" ? 38 : type === "quote" ? 28 : 17, color: "#171717" });
  const createGrid = (layout: GridLayout) => { insertBlock({ id: `grid-${Date.now()}`, type: "grid", x: 0, y: 0, width: 780, height: 360, content: "Distribución editorial", gridLayout: layout, gridSplit: layout === "left" ? 58 : 42, gridColumns: { left: [], right: [] }, fontSize: 16, color: "#171717" }); setGridDialogOpen(false); };
  const duplicateBlock = (id: string) => { const index = article.blocks.findIndex((block) => block.id === id); if (index < 0) return; const source = article.blocks[index]; const copy: PageBlock = { ...source, id: `${source.type}-${Date.now()}`, gridColumns: source.type === "grid" ? { left: [], right: [] } : source.gridColumns }; const blocks = [...article.blocks]; blocks.splice(index + 1, 0, copy); onChange({ blocks }); setFocusBlockId(copy.id); };
  const removeBlock = (id: string) => { const block = article.blocks.find((item) => item.id === id); const hasContent = block && (block.content.trim() || (block.type === "grid" && (block.gridColumns?.left.length || block.gridColumns?.right.length))); if (hasContent && block.type !== "divider" && !window.confirm(`¿Eliminar este bloque (${blockLabel(block)})?`)) return; onChange({ blocks: article.blocks.filter((item) => item.id !== id).map((item) => item.type === "grid" && item.gridColumns ? { ...item, gridColumns: { left: item.gridColumns.left.filter((child) => child !== id), right: item.gridColumns.right.filter((child) => child !== id) } } : item) }); };
  const removeFromGrid = (id: string) => onChange({ blocks: article.blocks.map((block) => block.type === "grid" && block.gridColumns ? { ...block, gridColumns: { left: block.gridColumns.left.filter((item) => item !== id), right: block.gridColumns.right.filter((item) => item !== id) } } : block) });
  const moveBlock = (id: string, direction: -1 | 1) => { const index = article.blocks.findIndex((block) => block.id === id); const target = index + direction; if (target < 0 || target >= article.blocks.length) return; const blocks = [...article.blocks]; [blocks[index], blocks[target]] = [blocks[target], blocks[index]]; onChange({ blocks }); };
  const updateText = (id: string) => (event: ChangeEvent<HTMLTextAreaElement>) => updateBlock(id, { content: event.target.value });
  const placeInGrid = (gridId: string, column: GridColumn) => { if (!draggedBlockId || draggedBlockId === gridId) return; const grid = article.blocks.find((block) => block.id === gridId); if (!grid) return; const nextColumns = { left: grid.gridColumns?.left.filter((id) => id !== draggedBlockId) || [], right: grid.gridColumns?.right.filter((id) => id !== draggedBlockId) || [] }; nextColumns[column] = [...nextColumns[column], draggedBlockId]; onChange({ blocks: article.blocks.map((block) => block.type === "grid" ? { ...block, gridColumns: block.id === gridId ? nextColumns : { left: block.gridColumns?.left.filter((id) => id !== draggedBlockId) || [], right: block.gridColumns?.right.filter((id) => id !== draggedBlockId) || [] } } : block) }); setDraggedBlockId(null); };
  const placedInGrid = new Set(article.blocks.flatMap((block) => block.type === "grid" && block.gridColumns ? [...block.gridColumns.left, ...block.gridColumns.right] : []));
  const topLevelBlocks = article.blocks.filter((block) => !placedInGrid.has(block.id));
  // Category was chosen before opening the editor and authorship is fixed at creation: both are shown, not edited.
  const meta = <dl className="article-draft-meta"><div><dt>Sección</dt><dd>{article.category || "Moda"}</dd></div><div><dt>Autoría</dt><dd>{article.author || "LIGHT"}</dd></div><div><dt>Lectura</dt><dd className="article-draft-meta__row"><input value={article.readingTime || ""} placeholder={`${minutes} min de lectura`} onChange={(event) => onChange({ readingTime: event.target.value })} aria-label="Tiempo de lectura" /><button type="button" onClick={() => onChange({ readingTime: `${minutes} min de lectura` })} title={`Calcular a partir de ${words} palabras`}>Calcular · {minutes} min</button></dd></div><div><dt>Fecha</dt><dd><input type="date" value={article.date || ""} onChange={(event) => onChange({ date: event.target.value })} aria-label="Fecha" /></dd></div></dl>;

  const renderGrid = (grid: PageBlock) => { const split = Math.min(78, Math.max(22, grid.gridSplit || (grid.gridLayout === "left" ? 58 : 42))); return <div className="draft-grid-shell"><p className="draft-grid-shell__hint">Arrastra bloques de la página a cada columna. Usa el separador central para ajustar el ancho.</p><div className={`draft-grid draft-grid--${grid.gridLayout || "left"}`} style={{ "--grid-split": `${split}%` } as CSSProperties}><GridColumnEditor label="Cuadro izquierda" ids={grid.gridColumns?.left || []} blocks={article.blocks} gridId={grid.id} column="left" dragging={Boolean(draggedBlockId && draggedBlockId !== grid.id)} onDrop={placeInGrid} onRemove={removeFromGrid} onChange={updateBlock} onDragBlock={setDraggedBlockId} /><GridColumnEditor label="Cuadro derecha" ids={grid.gridColumns?.right || []} blocks={article.blocks} gridId={grid.id} column="right" dragging={Boolean(draggedBlockId && draggedBlockId !== grid.id)} onDrop={placeInGrid} onRemove={removeFromGrid} onChange={updateBlock} onDragBlock={setDraggedBlockId} /></div><GridResizeHandle split={split} onResize={(next) => updateBlock(grid.id, { gridSplit: next })} /></div>; };

  return <><section ref={editorRef} className="article-draft-editor" aria-label="Editor de artículo">
    <header className="article-draft-toolbar">
      <button className="article-draft-back" onClick={leave}><ArrowLeft size={15} /> Páginas</button>
      <div><span className={`status-pill status-pill--${article.status}`}>{article.status === "published" ? "Publicado" : "En edición"}</span><span className={`article-draft-save-state${dirty || !article.slug ? " is-dirty" : ""}`} role="status">{dirty ? "Cambios sin guardar" : article.slug ? "Todo guardado" : "Sin guardar todavía"}</span><span className="article-draft-slug">{article.slug ? `/historias/${article.slug}` : "Sin URL hasta guardar"}</span></div>
      <div className="article-draft-toolbar__actions"><button className="admin-secondary" onClick={() => setPreviewOpen(true)}>Vista previa limpia</button><button className="admin-secondary" onClick={onSaveDraft} title="Guardar (Ctrl+S)"><Save size={15} /> Guardar edición</button><button className="admin-primary" disabled={!canPublish} onClick={onPublish}>{canPublish ? "Publicar página" : "Solo Owner / Admin"}</button></div>
    </header>
    <div className="article-draft-layout">
      <aside className="article-draft-controls">
        <p className="eyebrow">Edición</p><h2>Vista previa real.</h2><p className="article-draft-hint">La página que ves aquí es la misma estructura que se publicará en LIGHT.</p>
        <div className="article-draft-add"><button onClick={() => addBlock("heading")}><Type size={15} /> Subtítulo</button><button onClick={() => addBlock("paragraph")}><Type size={15} /> Párrafo</button><button onClick={() => addBlock("image")}><Image size={15} /> Imagen</button><button onClick={() => setGridDialogOpen(true)}><LayoutGrid size={15} /> Cuadrícula</button><button onClick={() => addBlock("quote")}><Quote size={15} /> Cita</button><button onClick={() => addBlock("divider")}><Minus size={15} /> Separador</button></div>
        <dl className="article-draft-stats"><div><dt>Palabras</dt><dd>{words.toLocaleString("es-ES")}</dd></div><div><dt>Lectura</dt><dd>~{minutes} min</dd></div><div><dt>Bloques</dt><dd>{article.blocks.length}</dd></div></dl>
        <p className="article-draft-shortcut">Ctrl + S guarda la edición</p>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
      </aside>
      <article className="article-draft-paper">
        <div className="article-draft-hero-split"><div className="article-draft-hero-copy"><input className="article-draft-kicker" value={article.eyebrow || ""} onChange={(event) => onChange({ eyebrow: event.target.value })} placeholder="LIGHT / PORTADA" aria-label="Kicker" /><AutoResizeTextarea className="article-draft-title" value={article.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Título de la historia" aria-label="Título" rows={1} /><input className="article-draft-dek" value={article.excerpt} onChange={(event) => onChange({ excerpt: event.target.value })} placeholder="La bajada o resumen de la historia..." />{meta}</div><div className="article-draft-hero"><DraftImage className="article-draft-hero__visual" src={article.image} empty="Pega aquí una URL directa de imagen" /><label className="article-draft-url">URL de imagen<input value={article.image} onChange={(event) => onChange({ image: event.target.value })} placeholder="https://ejemplo.com/imagen.jpg" /></label><input className="article-draft-caption" value={article.imageCaption || ""} onChange={(event) => onChange({ imageCaption: event.target.value })} placeholder="Pie de imagen · Crédito / fuente" /></div></div>
        <AutoResizeTextarea className="article-draft-lead" value={article.lead} onChange={(event) => onChange({ lead: event.target.value })} placeholder="La frase de inicio que abre la historia y marca su ritmo." aria-label="Frase de inicio" rows={1} />
        <div className="article-draft-blocks">
          {topLevelBlocks.length === 0 && <div className="article-draft-empty"><p>La historia todavía no tiene cuerpo.</p><div><button type="button" onClick={() => addBlock("paragraph")}><Type size={14} /> Empezar con un párrafo</button><button type="button" onClick={() => addBlock("image")}><Image size={14} /> Añadir imagen</button></div></div>}
          {topLevelBlocks.map((block, index) => <div className={`draft-content-block draft-content-block--${block.type}${block.type === "image" ? ` draft-content-block--image-${block.imageAlign || "full"}` : ""}${draggedBlockId === block.id ? " is-dragging" : ""}`} key={block.id} data-block-id={block.id} draggable={block.type !== "grid"} onDragStart={() => setDraggedBlockId(block.id)} onDragEnd={() => setDraggedBlockId(null)}>
            <div className="draft-content-block__tools"><span>{blockLabel(block)}</span><button onClick={() => moveBlock(block.id, -1)} title="Subir" disabled={index === 0}><ArrowUp size={14} /></button><button onClick={() => moveBlock(block.id, 1)} title="Bajar" disabled={index === topLevelBlocks.length - 1}><ArrowDown size={14} /></button><button onClick={() => duplicateBlock(block.id)} title="Duplicar"><Copy size={14} /></button><button onClick={() => removeBlock(block.id)} title="Eliminar"><Trash2 size={14} /></button></div>
            {block.type === "grid" ? renderGrid(block) : block.type === "image" ? <><DraftImage className="draft-inline-image" src={block.content} empty="Añade una URL de imagen" /><div className="draft-image-alignment" aria-label="Alineación de imagen"><span>Alinear</span><button className={block.imageAlign === "left" ? "is-active" : ""} onClick={() => updateBlock(block.id, { imageAlign: "left" })} title="Izquierda"><AlignLeft size={14} /><span>Izq.</span></button><button className={!block.imageAlign || block.imageAlign === "full" ? "is-active" : ""} onClick={() => updateBlock(block.id, { imageAlign: "full" })} title="Ancho completo"><AlignCenter size={14} /><span>Centro</span></button><button className={block.imageAlign === "right" ? "is-active" : ""} onClick={() => updateBlock(block.id, { imageAlign: "right" })} title="Derecha"><AlignRight size={14} /><span>Der.</span></button></div><input value={block.content} onChange={(event) => updateBlock(block.id, { content: event.target.value })} placeholder="https://ejemplo.com/imagen.jpg" aria-label="URL de imagen" /><input value={block.caption || ""} onChange={(event) => updateBlock(block.id, { caption: event.target.value })} placeholder="Pie de imagen · Crédito / fuente" aria-label="Pie de imagen" /></> : block.type === "divider" ? <hr /> : <AutoResizeTextarea className="draft-editable" value={block.content} onChange={updateText(block.id)} placeholder={placeholders[block.type]} aria-label={`Contenido ${blockLabel(block)}`} rows={1} />}
          </div>)}
        </div>
      </article>
    </div>
    {gridDialogOpen && <div className="grid-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGridDialogOpen(false); }}><div className="grid-dialog" role="dialog" aria-modal="true" aria-labelledby="grid-dialog-title"><button className="grid-dialog__close" onClick={() => setGridDialogOpen(false)} aria-label="Cerrar"><X size={18} /></button><p className="eyebrow">Nuevo elemento</p><h2 id="grid-dialog-title">Cuadrícula editorial</h2><p>Elige cómo quieres distribuir los bloques que arrastrarás dentro.</p><div className="grid-dialog__options"><button autoFocus onClick={() => createGrid("left")}><span className="grid-option-preview grid-option-preview--left"><i /><i /></span><strong>Cuadro izquierda</strong><small>Texto o imagen a la izquierda y otro bloque a la derecha.</small></button><button onClick={() => createGrid("right")}><span className="grid-option-preview grid-option-preview--right"><i /><i /></span><strong>Cuadro derecha</strong><small>El bloque principal queda a la derecha.</small></button></div></div></div>}
  </section>{previewOpen && <CleanArticlePreview article={article} onClose={() => setPreviewOpen(false)} />}</>;
}

function GridResizeHandle({ split, onResize }: { split: number; onResize: (value: number) => void }) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const shell = event.currentTarget.parentElement;
    if (!shell) return;
    const move = (moveEvent: PointerEvent | globalThis.PointerEvent) => {
      const rect = shell.getBoundingClientRect();
      const next = Math.round(Math.min(78, Math.max(22, ((moveEvent.clientX - rect.left) / rect.width) * 100)));
      onResize(next);
    };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };
  return <button className="draft-grid__resize" style={{ left: `calc(${split}% - 9px)` }} type="button" onPointerDown={handlePointerDown} aria-label={`Redimensionar cuadrícula (${split}%)`} title={`${split}% / ${100 - split}%`}><span /></button>;
}

function GridColumnEditor({ label, ids, blocks, gridId, column, dragging, onDrop, onRemove, onChange, onDragBlock }: { label: string; ids: string[]; blocks: PageBlock[]; gridId: string; column: GridColumn; dragging: boolean; onDrop: (gridId: string, column: GridColumn) => void; onRemove: (id: string) => void; onChange: (id: string, patch: Partial<PageBlock>) => void; onDragBlock: (id: string) => void }) {
  const allowDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); event.currentTarget.classList.add("is-drag-over"); };
  const stopDrag = (event: DragEvent<HTMLDivElement>) => event.currentTarget.classList.remove("is-drag-over");
  return <div className={`draft-grid__column${dragging ? " is-drop-ready" : ""}`} onDragOver={allowDrop} onDragLeave={stopDrag} onDrop={(event) => { event.preventDefault(); stopDrag(event); onDrop(gridId, column); }}><div className="draft-grid__column-head"><span>{label}</span><small>{ids.length ? `${ids.length} bloque${ids.length === 1 ? "" : "s"}` : "Arrastra aquí"}</small></div>{!ids.length && <p className="draft-grid__empty">{dragging ? "Suelta el bloque aquí" : "Arrastra un párrafo, imagen o cita desde la página."}</p>}{ids.map((id) => { const block = blocks.find((item) => item.id === id); if (!block) return null; return <div className="draft-grid__item" key={id} draggable onDragStart={(event) => { event.stopPropagation(); onDragBlock(id); }}><span>{blockLabel(block)}</span>{block.type === "image" && block.content ? <img className="draft-grid__image" src={block.content} alt="Vista previa de imagen" /> : null}<strong>{block.type === "image" ? (block.content ? "Imagen editorial" : "Sin URL de imagen") : (block.content || "Sin contenido")}</strong><button onClick={() => onRemove(id)} title="Sacar de la cuadrícula" aria-label="Sacar de la cuadrícula">×</button>{block.type === "image" ? <input className="draft-grid__item-editor" value={block.content} onChange={(event) => onChange(id, { content: event.target.value })} placeholder="URL de imagen" /> : block.type === "paragraph" || block.type === "heading" || block.type === "quote" ? <AutoResizeTextarea className="draft-grid__item-editor" value={block.content} onChange={(event) => onChange(id, { content: event.target.value })} placeholder={placeholders[block.type]} rows={1} /> : null}</div>; })}</div>;
}
