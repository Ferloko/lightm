import { ArrowUpRight, ImagePlus, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { describeError, supabase } from "@/lib/supabase";
import { createMagazineEdition, saveMagazineEditions } from "@/lib/magazineCatalog";
import type { MagazineEdition } from "@/lib/magazines";

function MagazineLivePreview({ edition }: { edition: MagazineEdition }) {
  return <aside className="magazine-live-preview" aria-label="Vista previa de la edición">
    <div className="magazine-live-preview__head"><div><p className="eyebrow">Vista previa final</p><h3>Así se verá la edición pública</h3></div><span>Sin textos superpuestos</span></div>
    <div className="magazine-preview-mirror"><div className="magazine-preview-mirror__heading"><p className="eyebrow">LIGHT / Edición {edition.number || "00"}</p><h4>{edition.title || "Nueva edición"}</h4><p>{edition.dek || "La descripción breve aparecerá aquí."}</p></div><div className="magazine-preview-mirror__spread"><div className="magazine-preview-mirror__cover">{edition.coverImage ? <img src={edition.coverImage} alt="Vista previa de portada" /> : <div className="magazine-live-preview__empty">Añade una imagen de portada</div>}</div><div className="magazine-preview-mirror__pages"><div className="magazine-preview-mirror__pages-head"><p className="eyebrow">Algunas páginas</p><span>Solo imágenes</span></div><div className="magazine-preview-mirror__grid">{edition.previewPages.slice(0, 12).map((page, index) => <div className="magazine-preview-mirror__page" key={`${page.image}-${index}`}>{page.image ? <img src={page.image} alt={`Página ${index + 1}`} /> : <span>{String(index + 1).padStart(2, "0")}</span>}</div>)}</div></div></div></div>
  </aside>;
}

export default function MagazineManager({ editions, onChange, readOnly = false }: { editions: MagazineEdition[]; onChange: (next: MagazineEdition[]) => void; readOnly?: boolean }) {
  const [editing, setEditing] = useState<MagazineEdition | null>(null);
  const [originalNumber, setOriginalNumber] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const open = (edition: MagazineEdition, isNew = false) => { setEditing(edition); setOriginalNumber(isNew ? null : edition.number); setNotice(""); };
  const update = (patch: Partial<MagazineEdition>) => setEditing((current) => current ? { ...current, ...patch } : current);
  const updatePage = (index: number, patch: Partial<MagazineEdition["previewPages"][number]>) => setEditing((current) => {
    if (!current) return current;
    return { ...current, previewPages: current.previewPages.map((page, pageIndex) => pageIndex === index ? { ...page, ...patch } : page) };
  });
  const save = async () => {
    if (!editing?.title.trim() || !editing.number.trim()) { setNotice("Añade número y título."); return; }
    if (editions.some((edition) => edition.number === editing.number && edition.number !== originalNumber)) { setNotice(`Ya existe la edición ${editing.number}. Usa otro número.`); return; }
    const next = [...editions.filter((edition) => edition.number !== editing.number && edition.number !== originalNumber), editing].sort((a, b) => a.number.localeCompare(b.number));
    setSaving(true);
    try { await saveMagazineEditions(next); onChange(next); setEditing(null); setNotice(supabase ? "Edición guardada. Ya la ve todo el equipo y el público." : "Edición guardada en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudo guardar la edición: ${describeError(error)}`); }
    finally { setSaving(false); }
  };
  const remove = async (number: string) => {
    if (!window.confirm(`¿Eliminar la edición ${number}?`)) return;
    const next = editions.filter((edition) => edition.number !== number);
    try { await saveMagazineEditions(next); onChange(next); if (editing?.number === number) setEditing(null); setNotice(`Edición ${number} eliminada.`); }
    catch (error) { setNotice(`No se pudo eliminar: ${describeError(error)}`); }
  };

  return <section className="magazine-manager">
    <div className="admin-section-heading"><div><p>La revista / catálogo</p><h2>Ediciones y portadas.</h2></div>{!readOnly && <button className="admin-primary" type="button" onClick={() => open(createMagazineEdition(editions), true)}><Plus size={15} /> Nueva edición</button>}</div>{notice && <p className="admin-notice" role="status">{notice}</p>}
    <p className="magazine-manager__intro">Crea la edición como una página editorial: edita los datos y comprueba a la derecha cómo quedará la portada y la cuadrícula de páginas antes de guardarla.</p>
    <div className="magazine-manager__grid">{editions.map((edition) => <article className="magazine-manager-card" key={edition.number}><div className="magazine-manager-card__cover" style={edition.coverImage ? { backgroundImage: `url(${edition.coverImage})` } : undefined}><span>EDICIÓN {edition.number}</span></div><div className="magazine-manager-card__body"><div><p className="eyebrow">{edition.date}</p><h3>{edition.title}</h3></div><div className="magazine-manager-card__actions"><button type="button" onClick={() => open(edition)}><Pencil size={14} /> {readOnly ? "Ver" : "Editar"}</button>{!readOnly && <button type="button" onClick={() => void remove(edition.number)} aria-label={`Eliminar edición ${edition.number}`}><Trash2 size={14} /></button>}<a href={`/revista/${edition.number}`} target="_blank" rel="noreferrer">Abrir <ArrowUpRight size={13} /></a></div></div></article>)}</div>
    {editing && <div className="magazine-editor-panel">
      <div className="magazine-editor-panel__heading"><div><p className="eyebrow">Edición editable</p><h3>{editing.title || "Nueva edición"}</h3></div><button className="admin-secondary" type="button" onClick={() => setEditing(null)}>Cerrar</button></div>
      <div className="magazine-editor-workspace">
        <fieldset className="magazine-editor-workspace__form admin-fieldset" disabled={readOnly}>
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
          <fieldset className="magazine-hero-editor"><legend><ImagePlus size={14} /> Banner de la edición</legend><p>Imagen de fondo de la cabecera en la página de la edición, con el título y la descripción encima. Sin imagen, la cabecera se muestra solo con texto.</p>
            <div className="magazine-hero-editor__preview" style={editing.heroImage ? { backgroundImage: `url(${JSON.stringify(editing.heroImage)})`, backgroundPosition: `center ${editing.heroPosition || "center"}` } : undefined}>{editing.heroImage ? <div><span>LIGHT / Edición {editing.number}</span><strong>{editing.title || "Nueva edición"}</strong></div> : <span className="magazine-hero-editor__empty">Añade una URL de imagen para ver el banner</span>}</div>
            <label className="magazine-editor-panel__wide">URL de la imagen del banner<input value={editing.heroImage || ""} onChange={(event) => update({ heroImage: event.target.value })} placeholder="https://..." disabled={readOnly} /></label>
            <label>Encuadre<select value={editing.heroPosition || "center"} onChange={(event) => update({ heroPosition: event.target.value as "top" | "center" | "bottom" })} disabled={readOnly}><option value="top">Parte superior</option><option value="center">Centro</option><option value="bottom">Parte inferior</option></select></label>
          </fieldset>
          <fieldset className="magazine-pages-editor"><legend><ImagePlus size={14} /> Imágenes interiores</legend><p>La portada y las páginas interiores se muestran únicamente con sus imágenes. Los campos editoriales se conservan para el contenido de la edición, pero nunca se superponen sobre las imágenes.</p>{editing.previewPages.slice(0, 12).map((page, index) => <div className="magazine-page-editor" key={`${page.label}-${index}`}><strong>Página {index + 1}</strong><label>Imagen<input value={page.image} onChange={(event) => updatePage(index, { image: event.target.value })} placeholder="https://..." /></label><div className="magazine-page-editor__meta"><label>Etiqueta<input value={page.label} onChange={(event) => updatePage(index, { label: event.target.value })} /></label><label>Título interno<input value={page.title} onChange={(event) => updatePage(index, { title: event.target.value })} /></label></div><label>Texto interno<textarea value={page.text} onChange={(event) => updatePage(index, { text: event.target.value })} rows={2} /></label></div>)}</fieldset>
          <div className="magazine-editor-panel__actions">{!readOnly && <button className="admin-primary" type="button" onClick={() => void save()} disabled={saving}><Save size={15} /> {saving ? "Guardando…" : "Guardar edición"}</button>}{(editing.iframe || editing.src) && <a className="admin-secondary" href={editing.iframe || editing.src} target="_blank" rel="noreferrer">Probar Heyzine <ArrowUpRight size={14} /></a>}</div>
        </fieldset>
        <MagazineLivePreview edition={editing} />
      </div>
    </div>}
  </section>;
}
