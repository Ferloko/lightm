import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, ChevronLeft, Monitor, Plus, RotateCcw, Save, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { describeError, supabase } from "@/lib/supabase";
import { createMagazineEdition, saveMagazineEditions } from "@/lib/magazineCatalog";
import type { MagazineEdition } from "@/lib/magazines";
import { ImageUrlButton, ImageUrlFrame, InlineText } from "@/components/InlineEditing";
import { safeImageUrl } from "@/lib/utils";

type Device = "desktop" | "mobile";
type Page = MagazineEdition["previewPages"][number];

/** Catálogo de ediciones y editor que reproduce la página pública de la edición (/revista/:número). */
export default function MagazineManager({ editions, onChange, readOnly = false }: { editions: MagazineEdition[]; onChange: (next: MagazineEdition[]) => void; readOnly?: boolean }) {
  const [editing, setEditing] = useState<MagazineEdition | null>(null);
  const [original, setOriginal] = useState<MagazineEdition | null>(null);
  const [originalNumber, setOriginalNumber] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const open = (edition: MagazineEdition, isNew = false) => { setEditing(edition); setOriginal(edition); setOriginalNumber(isNew ? null : edition.number); setSelectedPage(null); setNotice(""); window.scrollTo({ top: 0 }); };
  const close = () => { if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Salir igualmente?")) return; setEditing(null); setNotice(""); };
  const update = (patch: Partial<MagazineEdition>) => setEditing((current) => current ? { ...current, ...patch } : current);
  const updatePage = (index: number, patch: Partial<Page>) => setEditing((current) => current ? { ...current, previewPages: current.previewPages.map((page, pageIndex) => pageIndex === index ? { ...page, ...patch } : page) } : current);
  const movePage = (index: number, direction: -1 | 1) => setEditing((current) => {
    if (!current) return current;
    const target = index + direction;
    if (target < 0 || target >= current.previewPages.length) return current;
    const pages = [...current.previewPages];
    [pages[index], pages[target]] = [pages[target], pages[index]];
    setSelectedPage(target);
    return { ...current, previewPages: pages };
  });
  const dirty = Boolean(editing && original && JSON.stringify(editing) !== JSON.stringify(original));

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.number.trim()) { setNotice("Añade número y título."); return; }
    if (editions.some((edition) => edition.number === editing.number && edition.number !== originalNumber)) { setNotice(`Ya existe la edición ${editing.number}. Usa otro número.`); return; }
    const next = [...editions.filter((edition) => edition.number !== editing.number && edition.number !== originalNumber), editing].sort((a, b) => a.number.localeCompare(b.number));
    setSaving(true);
    try { await saveMagazineEditions(next); onChange(next); setOriginal(editing); setOriginalNumber(editing.number); setNotice(supabase ? "Edición guardada. Ya la ve todo el equipo y el público." : "Edición guardada en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudo guardar la edición: ${describeError(error)}`); }
    finally { setSaving(false); }
  };
  const remove = async (number: string) => {
    if (!window.confirm(`¿Eliminar la edición ${number}? No se puede deshacer.`)) return;
    const next = editions.filter((edition) => edition.number !== number);
    try { await saveMagazineEditions(next); onChange(next); if (editing?.number === number) setEditing(null); setNotice(`Edición ${number} eliminada.`); }
    catch (error) { setNotice(`No se pudo eliminar: ${describeError(error)}`); }
  };

  /* ── Catálogo ── */
  if (!editing) return <section className="magazine-catalog-admin">
    <div className="admin-section-heading"><div><p>La revista / catálogo</p><h2>Ediciones y portadas.</h2></div></div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="edition-shelf">
      {!readOnly && <button type="button" className="edition-shelf__new" onClick={() => open(createMagazineEdition(editions), true)}><Plus size={22} strokeWidth={1.4} /><strong>Nueva edición</strong><span>Edición {String(editions.reduce((max, edition) => Math.max(max, Number.parseInt(edition.number, 10) || 0), 0) + 1).padStart(2, "0")}</span></button>}
      {editions.map((edition) => {
        const cover = safeImageUrl(edition.coverImage);
        const pagesWithImage = edition.previewPages.filter((page) => page.image).length;
        return <article className="edition-shelf__item" key={edition.number}>
          <button type="button" className="edition-shelf__cover" onClick={() => open(edition)} aria-label={`${readOnly ? "Ver" : "Editar"} ${edition.title}`}>{cover ? <img src={cover} alt="" /> : <span className="edition-shelf__no-cover"><BookOpen size={22} strokeWidth={1.3} />Sin portada</span>}<b>{edition.number}</b></button>
          <div className="edition-shelf__meta"><p className="eyebrow">{edition.date || "Sin fecha"}</p><h3>{edition.title}</h3><small>{pagesWithImage}/12 páginas con imagen · {edition.heroImage ? "con banner" : "sin banner"} · {edition.iframe || edition.src || edition.embedHtml ? "lector listo" : "sin lector"}</small></div>
          <div className="edition-shelf__actions"><button type="button" onClick={() => open(edition)}>{readOnly ? "Ver" : "Editar"}</button><a href={`/revista/${edition.number}`} target="_blank" rel="noreferrer">Abrir <ArrowUpRight size={12} /></a>{!readOnly && <button type="button" onClick={() => void remove(edition.number)} aria-label={`Eliminar edición ${edition.number}`}><Trash2 size={13} /></button>}</div>
        </article>;
      })}
    </div>
  </section>;

  /* ── Editor ── */
  const page = selectedPage !== null ? editing.previewPages[selectedPage] : null;
  const heroImage = safeImageUrl(editing.heroImage);
  return <section className="wysiwyg-manager edition-editor">
    <header className="wysiwyg-toolbar">
      <div><button type="button" className="edition-editor__back" onClick={close}><ChevronLeft size={14} /> Ediciones</button><h2>{originalNumber ? `Edición ${editing.number}` : "Nueva edición"}</h2></div>
      <div className="wysiwyg-toolbar__actions">
        <div className="wysiwyg-devices" role="group" aria-label="Tamaño de la vista"><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")} aria-label="Ordenador"><Monitor size={15} /></button><button type="button" className={device === "mobile" ? "is-active" : ""} onClick={() => setDevice("mobile")} aria-label="Móvil"><Smartphone size={15} /></button></div>
        {originalNumber && <a className="admin-secondary" href={`/revista/${originalNumber}`} target="_blank" rel="noreferrer">Ver pública <ArrowUpRight size={13} /></a>}
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => original && setEditing(original)} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || (!dirty && Boolean(originalNumber))}><Save size={15} /> {saving ? "Guardando…" : dirty || !originalNumber ? "Guardar edición" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <p className="wysiwyg-hint">Escribe sobre el título y la descripción, haz clic en la portada para cambiarla y selecciona una página para editarla en el panel. Así se verá la edición pública.</p>

    <div className="edition-editor__layout">
      <div className={`wysiwyg-stage wysiwyg-stage--${device}`}>
        <div className="wysiwyg-canvas edition-canvas">
          <section className={`magazine-edition-heading${heroImage ? ` magazine-edition-heading--hero magazine-edition-heading--${editing.heroPosition || "center"}` : ""}`}>
            {heroImage && <img className="magazine-edition-heading__image" src={heroImage} alt="" />}
            <ImageUrlButton className="edition-canvas__banner-button" src={editing.heroImage || ""} onChange={(heroImage) => update({ heroImage })} label="Banner" readOnly={readOnly} />
            <div className="magazine-edition-heading__copy"><p className="eyebrow">LIGHT / Edición {editing.number || "00"}</p><h1><InlineText multiline value={editing.title} onChange={(title) => update({ title })} placeholder="Título de la edición" readOnly={readOnly} ariaLabel="Título" /></h1></div>
            <p><InlineText multiline value={editing.dek} onChange={(dek) => update({ dek })} placeholder="Una frase que presente la edición" readOnly={readOnly} ariaLabel="Descripción" /></p>
          </section>
          <section className="magazine-spread">
            <div className="magazine-spread__cover">
              <ImageUrlFrame className="magazine-cover-art magazine-cover-art--image-only edition-canvas__cover" src={editing.coverImage} onChange={(coverImage) => update({ coverImage })} emptyLabel="Haz clic para añadir la portada" readOnly={readOnly} />
              <div className="magazine-spread__cover-meta"><span><InlineText value={editing.date} onChange={(date) => update({ date })} placeholder="Fecha o etiqueta" readOnly={readOnly} ariaLabel="Fecha o etiqueta" /></span><span>LIGHT / {editing.number}</span></div>
            </div>
            <div className="magazine-spread__preview">
              <div className="magazine-spread__preview-head"><p className="eyebrow">Algunas páginas</p><span>Una vista de la edición</span></div>
              <div className="magazine-pages-grid">{editing.previewPages.slice(0, 12).map((item, index) => {
                const src = safeImageUrl(item.image);
                return <article className={`magazine-preview-page edition-canvas__page${selectedPage === index ? " is-selected" : ""}`} key={index}><button type="button" onClick={() => setSelectedPage(selectedPage === index ? null : index)} aria-label={`Página ${index + 1}`} aria-pressed={selectedPage === index}><div className="magazine-preview-page__art magazine-preview-page__art--image-only">{src ? <img src={src} alt="" /> : <span className="edition-canvas__page-empty">{String(index + 1).padStart(2, "0")}</span>}</div><b className="edition-canvas__page-number">{String(index + 1).padStart(2, "0")}</b></button></article>;
              })}</div>
            </div>
          </section>
        </div>
      </div>

      <aside className="edition-panel" aria-label="Ajustes de la edición">
        {page && selectedPage !== null ? <fieldset className="edition-panel__group" disabled={readOnly}>
          <legend>Página {selectedPage + 1}</legend>
          <ImageUrlFrame className="edition-panel__page-image" src={page.image} onChange={(image) => updatePage(selectedPage, { image })} emptyLabel="Haz clic para añadir la imagen de esta página" readOnly={readOnly} />
          <label>Etiqueta<input value={page.label} onChange={(event) => updatePage(selectedPage, { label: event.target.value })} placeholder="02 / Ensayo" /></label>
          <label>Título interno<input value={page.title} onChange={(event) => updatePage(selectedPage, { title: event.target.value })} /></label>
          <label>Texto interno<textarea rows={3} value={page.text} onChange={(event) => updatePage(selectedPage, { text: event.target.value })} /></label>
          <small>La etiqueta, el título y el texto no se muestran sobre la imagen: sirven para el buscador y la organización interna.</small>
          <div className="edition-panel__row"><button type="button" className="admin-secondary" onClick={() => movePage(selectedPage, -1)} disabled={selectedPage === 0}><ArrowLeft size={13} /> Antes</button><button type="button" className="admin-secondary" onClick={() => movePage(selectedPage, 1)} disabled={selectedPage === editing.previewPages.length - 1}>Después <ArrowRight size={13} /></button><button type="button" className="wysiwyg-link" onClick={() => setSelectedPage(null)}>Listo</button></div>
        </fieldset> : <p className="edition-panel__tip">Selecciona una de las 12 páginas para cambiar su imagen u ordenarla.</p>}

        <fieldset className="edition-panel__group" disabled={readOnly}>
          <legend>Datos</legend>
          <div className="edition-panel__row"><label>Número<input value={editing.number} onChange={(event) => update({ number: event.target.value })} inputMode="numeric" /></label><label>Fecha o etiqueta<input value={editing.date} onChange={(event) => update({ date: event.target.value })} /></label></div>
        </fieldset>

        <fieldset className="edition-panel__group" disabled={readOnly}>
          <legend>Banner</legend>
          <label>Imagen del banner<input value={editing.heroImage || ""} onChange={(event) => update({ heroImage: event.target.value })} placeholder="https://… (vacío = cabecera solo con texto)" /></label>
          <label>Encuadre<select value={editing.heroPosition || "center"} onChange={(event) => update({ heroPosition: event.target.value as "top" | "center" | "bottom" })}><option value="top">Parte superior</option><option value="center">Centro</option><option value="bottom">Parte inferior</option></select></label>
        </fieldset>

        <fieldset className="edition-panel__group" disabled={readOnly}>
          <legend>Lector completo (Heyzine)</legend>
          <label>Enlace del flipbook<input value={editing.iframe || editing.src} onChange={(event) => update({ iframe: event.target.value, src: event.target.value })} placeholder="https://heyzine.com/flip-book/…" /></label>
          <details><summary>Pegar el código HTML del embed</summary><textarea rows={6} value={editing.embedHtml || ""} onChange={(event) => update({ embedHtml: event.target.value })} placeholder="Código HTML que entrega Heyzine" /><small>Si existe, tiene prioridad sobre el enlace.</small></details>
          {(editing.iframe || editing.src) && <a className="admin-secondary" href={editing.iframe || editing.src} target="_blank" rel="noreferrer">Probar lector <ArrowUpRight size={13} /></a>}
        </fieldset>
      </aside>
    </div>
  </section>;
}
