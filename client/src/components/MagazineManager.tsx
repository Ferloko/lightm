import { ArrowUpRight, ImagePlus, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { createMagazineEdition, saveMagazineEditions } from "@/lib/magazineCatalog";
import type { MagazineEdition } from "@/lib/magazines";

function MagazineLivePreview({ edition }: { edition: MagazineEdition }) {
  return <aside className="magazine-live-preview" aria-label="Vista previa de la edición">
    <div className="magazine-live-preview__head"><div><p className="eyebrow">Vista previa final</p><h3>Así se verá La revista</h3></div><span>Se actualiza al escribir</span></div>
    <div className="magazine-live-preview__cover">{edition.coverImage ? <img src={edition.coverImage} alt="Vista previa de portada" /> : <div className="magazine-live-preview__empty">Añade una imagen de portada</div>}</div>
    <div className="magazine-live-preview__details"><p className="eyebrow">{edition.date || "Edición"}</p><h4>{edition.title || "Título de la edición"}</h4><p>{edition.dek || "La descripción breve aparecerá aquí."}</p></div>
    <div className="magazine-live-preview__pages"><div className="magazine-live-preview__pages-head"><p className="eyebrow">Algunas páginas</p><span>12 imágenes</span></div><div className="magazine-live-preview__grid">{edition.previewPages.slice(0, 12).map((page, index) => <div className="magazine-live-preview__page" key={`${page.image}-${index}`}>{page.image ? <img src={page.image} alt={`Página ${index + 1}`} /> : <span>{String(index + 1).padStart(2, "0")}</span>}</div>)}</div></div>
  </aside>;
}

export default function MagazineManager({ editions, onChange }: { editions: MagazineEdition[]; onChange: (next: MagazineEdition[]) => void }) {
  const [editing, setEditing] = useState<MagazineEdition | null>(null);
  const [notice, setNotice] = useState("");
  const update = (patch: Partial<MagazineEdition>) => setEditing((current) => current ? { ...current, ...patch } : current);
  const updatePage = (index: number, patch: Partial<MagazineEdition["previewPages"][number]>) => setEditing((current) => {
    if (!current) return current;
    return { ...current, previewPages: current.previewPages.map((page, pageIndex) => pageIndex === index ? { ...page, ...patch } : page) };
  });
  const save = async () => {
    if (!editing?.title.trim() || !editing.number.trim()) return;
    const next = [...editions.filter((edition) => edition.number !== editing.number), editing].sort((a, b) => a.number.localeCompare(b.number));
    try { await saveMagazineEditions(next); onChange(next); setEditing(null); setNotice("Edición guardada en Supabase."); } catch (error) { setNotice(`No se pudo guardar la edición: ${error instanceof Error ? error.message : "error desconocido"}`); }
  };
  const remove = async (number: string) => { const next = editions.filter((edition) => edition.number !== number); try { await saveMagazineEditions(next); onChange(next); if (editing?.number === number) setEditing(null); setNotice("Edición eliminada de Supabase."); } catch (error) { setNotice(`No se pudo eliminar la edición: ${error instanceof Error ? error.message : "error desconocido"}`); } };

  return <section className="magazine-manager">
    <div className="admin-section-heading"><div><p>La revista / catálogo</p><h2>Ediciones y portadas.</h2></div><button className="admin-primary" type="button" onClick={() => setEditing(createMagazineEdition())}><Plus size={15} /> Nueva edición</button></div>
    <p className="magazine-manager__intro">Crea la edición como una página editorial: edita los datos y comprueba a la derecha cómo quedará la portada y la cuadrícula de páginas antes de guardarla.</p>{notice && <p className="admin-notice">{notice}</p>}
    <div className="magazine-manager__grid">{editions.map((edition) => <article className="magazine-manager-card" key={edition.number}><div className="magazine-manager-card__cover" style={edition.coverImage ? { backgroundImage: `url(${edition.coverImage})` } : undefined}><span>EDICIÓN {edition.number}</span></div><div className="magazine-manager-card__body"><div><p className="eyebrow">{edition.date}</p><h3>{edition.title}</h3></div><div className="magazine-manager-card__actions"><button type="button" onClick={() => setEditing(edition)}><Pencil size={14} /> Editar</button><button type="button" onClick={() => remove(edition.number)} aria-label={`Eliminar edición ${edition.number}`}><Trash2 size={14} /></button></div></div></article>)}</div>
    {editing && <div className="magazine-editor-panel">
      <div className="magazine-editor-panel__heading"><div><p className="eyebrow">Edición editable</p><h3>{editing.title || "Nueva edición"}</h3></div><button className="admin-secondary" type="button" onClick={() => setEditing(null)}>Cerrar</button></div>
      <div className="magazine-editor-workspace">
        <div className="magazine-editor-workspace__form">
          <div className="magazine-editor-panel__fields">
            <label>Número<input value={editing.number} onChange={(event) => update({ number: event.target.value })} /></label>
            <label>Título<input value={editing.title} onChange={(event) => update({ title: event.target.value })} /></label>
            <label>Fecha o etiqueta<input value={editing.date} onChange={(event) => update({ date: event.target.value })} /></label>
            <label>URL de Heyzine<input value={editing.src} onChange={(event) => update({ src: event.target.value })} placeholder="https://heyzine.com/flip-book/..." /></label>
            <label className="magazine-editor-panel__wide">URL del iframe/embed<input value={editing.iframe || editing.src} onChange={(event) => update({ iframe: event.target.value, src: editing.src || event.target.value })} placeholder="https://heyzine.com/flip-book/...html" /></label>
            <label className="magazine-editor-panel__wide">HTML completo del embed<textarea value={editing.embedHtml || ""} onChange={(event) => update({ embedHtml: event.target.value })} placeholder="Pega aquí el código HTML completo que te entrega Heyzine" rows={8} /><small className="magazine-field-help">Si existe este HTML, tendrá prioridad sobre la URL y se abrirá directamente dentro del lector.</small></label>
            <label className="magazine-editor-panel__wide">URL de portada<input value={editing.coverImage} onChange={(event) => update({ coverImage: event.target.value })} placeholder="https://..." /><small className="magazine-field-help">La imagen se muestra sin textos automáticos encima.</small></label>
            <label className="magazine-editor-panel__wide">Descripción breve<textarea value={editing.dek} onChange={(event) => update({ dek: event.target.value })} rows={3} /></label>
          </div>
          <fieldset className="magazine-pages-editor"><legend><ImagePlus size={14} /> Imágenes interiores</legend><p>La preview usa solo estas imágenes, sin títulos ni etiquetas superpuestas. La tercera fila puede extenderse por debajo de la portada.</p>{editing.previewPages.slice(0, 12).map((page, index) => <div className="magazine-page-editor" key={`${page.label}-${index}`}><strong>Página {index + 1}</strong><label>Imagen<input value={page.image} onChange={(event) => updatePage(index, { image: event.target.value })} placeholder="https://..." /></label><div className="magazine-page-editor__meta"><label>Etiqueta<input value={page.label} onChange={(event) => updatePage(index, { label: event.target.value })} /></label><label>Título interno<input value={page.title} onChange={(event) => updatePage(index, { title: event.target.value })} /></label></div><label>Texto interno<textarea value={page.text} onChange={(event) => updatePage(index, { text: event.target.value })} rows={2} /></label></div>)}</fieldset>
          <div className="magazine-editor-panel__actions"><button className="admin-primary" type="button" onClick={save}><Save size={15} /> Guardar edición</button>{(editing.iframe || editing.src) && <a className="admin-secondary" href={editing.iframe || editing.src} target="_blank" rel="noreferrer">Probar Heyzine <ArrowUpRight size={14} /></a>}</div>
        </div>
        <MagazineLivePreview edition={editing} />
      </div>
    </div>}
  </section>;
}
