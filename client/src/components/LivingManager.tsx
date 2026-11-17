import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Eye, FolderPlus, Heading, ImagePlus, ImageOff, Pencil, Plus, Quote, Save, Search, Settings2, Star, Trash2, Type } from "lucide-react";
import { FullscreenPreview, keepLinksInPlace } from "@/components/PagePreview";
import LivingHeader from "@/components/LivingHeader";
import { LivingItemView } from "@/pages/LivingItemPage";
import { LivingCover, LivingRank, LivingReview, Rating } from "@/components/LivingCards";
import { blankLivingCategory, blankLivingItem, livingCategoryOf, livingCriteria, livingFormats, livingBlocks, livingBody, livingHref, livingSlugify, uniqueLivingSlug, livingScoreOf, saveLivingGuide, useLivingGuide, type LivingBlock, type LivingCategory, type LivingGuide, type LivingItem, type LivingPrice } from "@/lib/living";
import { describeError, supabase } from "@/lib/supabase";

const NONE = "__none__";

/** Crear, renombrar, ordenar y borrar las categorías de la guía. */
function CategoriesPanel({ guide, readOnly, onSave, onClose }: { guide: LivingGuide; readOnly: boolean; onSave: (categories: LivingCategory[]) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState<LivingCategory[]>(guide.categories);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(guide.categories);
  const count = (id: string) => guide.items.filter((item) => item.categoryId === id).length;
  const update = (id: string, patch: Partial<LivingCategory>) => setDraft((list) => list.map((category) => category.id === id ? { ...category, ...patch } : category));
  const move = (index: number, direction: -1 | 1) => setDraft((list) => { const target = index + direction; if (target < 0 || target >= list.length) return list; const next = [...list]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const remove = (category: LivingCategory) => {
    const n = count(category.id);
    if (!window.confirm(n ? `“${category.label}” tiene ${n} ${n === 1 ? "lugar" : "lugares"}. Si la borras, pasan a “Sin categoría” (no se publican, pero no se pierden). ¿Borrar la categoría?` : `¿Borrar la categoría “${category.label || "sin nombre"}”?`)) return;
    setDraft((list) => list.filter((item) => item.id !== category.id));
  };
  const save = async () => {
    const cleaned = draft.map((category) => ({ ...category, label: category.label.trim(), singular: category.singular.trim() || category.label.trim(), title: category.title.trim(), detailLabel: category.detailLabel.trim() || (category.format === "resort" ? "Ideal para" : "Lo imprescindible") }));
    if (cleaned.some((category) => !category.label)) { setError("Cada categoría necesita un nombre."); return; }
    setSaving(true); setError("");
    try { await onSave(cleaned); onClose(); } catch (cause) { setError(`No se pudo guardar: ${describeError(cause)}`); } finally { setSaving(false); }
  };
  return <section className="living-categories" aria-label="Categorías de Living">
    <header><div><p className="eyebrow">The Guide</p><h3>Categorías</h3><p>Cada categoría es una sección de la hoja Living, en este orden. Las que no tienen lugares no se muestran.</p></div><button type="button" className="admin-secondary" onClick={() => { if (!dirty || window.confirm("¿Descartar los cambios en las categorías?")) onClose(); }}>Cerrar</button></header>
    <fieldset className="admin-fieldset" disabled={readOnly}>
      <ol className="living-categories__list">{draft.map((category, index) => <li key={category.id}>
        <span className="living-categories__index">{String(index + 1).padStart(2, "0")}</span>
        <div className="living-categories__fields">
          <label>Nombre (plural)<input value={category.label} onChange={(event) => update(category.id, { label: event.target.value })} placeholder="Peluquerías" /></label>
          <label>Singular<input value={category.singular} onChange={(event) => update(category.id, { singular: event.target.value })} placeholder="Peluquería" /></label>
          <label className="living-categories__wide">Titular de la sección<input value={category.title} onChange={(event) => update(category.id, { title: event.target.value })} placeholder="Manos expertas y buen ojo." /></label>
          <label>Formato<select value={category.format} onChange={(event) => update(category.id, { format: event.target.value as LivingCategory["format"] })}>{livingFormats.map((format) => <option key={format.format} value={format.format}>{format.label}</option>)}</select><small>{livingFormats.find((format) => format.format === category.format)?.help}</small></label>
          <label>Dato estrella<input value={category.detailLabel} onChange={(event) => update(category.id, { detailLabel: event.target.value })} placeholder={category.format === "resort" ? "Ideal para" : "Servicio estrella"} /><small>Se muestra en cada lugar: “Qué pedir”, “Servicio estrella”…</small></label>
        </div>
        <div className="living-categories__actions"><span>{count(category.id)} {count(category.id) === 1 ? "lugar" : "lugares"}</span><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir"><ArrowUp size={13} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label="Bajar"><ArrowDown size={13} /></button><button type="button" onClick={() => remove(category)} aria-label={`Borrar ${category.label}`}><Trash2 size={13} /></button></div>
      </li>)}</ol>
      {draft.length === 0 && <p className="living-sheet__note">No hay categorías: la hoja Living mostrará que la guía se está preparando.</p>}
      {!readOnly && <div className="living-categories__foot"><button type="button" className="admin-secondary" onClick={() => setDraft((list) => [...list, blankLivingCategory()])}><FolderPlus size={14} /> Nueva categoría</button><span>{error}</span><button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || !dirty}><Save size={14} /> {saving ? "Guardando…" : "Guardar categorías"}</button></div>}
    </fieldset>
  </section>;
}

export default function LivingManager({ readOnly = false }: { readOnly?: boolean }) {
  const [remote] = useLivingGuide();
  const [guide, setGuide] = useState<LivingGuide>(remote);
  useEffect(() => { setGuide(remote); }, [remote]);
  const [editing, setEditing] = useState<LivingItem | null>(null);
  const [original, setOriginal] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("todo");
  const [saving, setSaving] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [blocks, setBlockState] = useState<LivingBlock[]>([]);
  const [cleanPreview, setCleanPreview] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  const categoryOf = (item: LivingItem) => livingCategoryOf(guide, item);
  const coverOf = (category: LivingCategory) => { const items = guide.items.filter((item) => item.categoryId === category.id); return items.find((item) => item.id === category.featuredId) || items[0] || null; };
  const isFeatured = (item: LivingItem) => { const category = categoryOf(item); return Boolean(category && category.format === "resort" && coverOf(category)?.id === item.id); };
  const counts = useMemo(() => { const result: Record<string, number> = {}; guide.items.forEach((item) => { const key = item.categoryId && guide.categories.some((category) => category.id === item.categoryId) ? item.categoryId : NONE; result[key] = (result[key] || 0) + 1; }); return result; }, [guide]);
  useEffect(() => { if (filter !== "todo" && filter !== NONE && !guide.categories.some((category) => category.id === filter)) setFilter("todo"); }, [filter, guide.categories]);
  const visible = guide.items.filter((item) => (filter === "todo" || (filter === NONE ? !categoryOf(item) : item.categoryId === filter)) && `${item.name} ${item.category} ${item.place} ${item.verdict}`.toLowerCase().includes(query.trim().toLowerCase()));
  const open = (item: LivingItem) => { const normalized = { ...item, body: livingBody(livingBlocks(item.body)) }; setEditing(normalized); setOriginal(JSON.stringify(normalized)); setBlockState(livingBlocks(item.body)); setNotice(""); };
  const dirty = editing ? JSON.stringify(editing) !== original : false;
  const close = () => { if (dirty && !readOnly && !window.confirm("Hay cambios sin guardar en este lugar. ¿Salir de todos modos?")) return; setEditing(null); setNotice(""); };
  const update = (patch: Partial<LivingItem>) => setEditing((current) => current ? { ...current, ...patch } : current);
  const setBlocks = (next: LivingBlock[]) => { setBlockState(next); update({ body: livingBody(next) }); };
  /** Añade un bloque al final de la reseña y lo lleva a la vista con el cursor dentro. */
  const addBlock = (block: LivingBlock) => {
    const index = blocks.length;
    setBlocks([...blocks, block]);
    window.requestAnimationFrame(() => { const element = paperRef.current?.querySelector<HTMLElement>(`[data-block-index="${index}"]`); element?.scrollIntoView({ behavior: "smooth", block: "center" }); (element?.querySelector("textarea, input") as HTMLElement | null)?.focus({ preventScroll: true }); element?.querySelector<HTMLButtonElement>(".image-url-frame__trigger")?.click(); });
  };
  const savedNotice = (what: string) => supabase ? `${what} Ya lo ve todo el equipo y el público.` : `${what} (guardado en este navegador de demostración).`;

  const persist = async (next: LivingGuide) => { await saveLivingGuide(next); setGuide(next); };
  const saveCategories = async (categories: LivingCategory[]) => {
    const formats = new Map(categories.map((category) => [category.id, category.format]));
    // Los lugares de una categoría borrada quedan sin categoría; los demás toman el formato de la suya.
    const items = guide.items.map((item) => formats.has(item.categoryId) ? { ...item, kind: formats.get(item.categoryId)! } : { ...item, categoryId: "" });
    await persist({ ...guide, categories, items });
    setNotice(savedNotice("Categorías guardadas."));
  };
  const save = async () => {
    if (!editing?.name.trim()) { setNotice("Añade un nombre."); return; }
    const category = categoryOf(editing);
    const named = { ...editing, name: editing.name.trim(), kind: category?.format || editing.kind, body: livingBody(blocks), gallery: editing.gallery.map((url) => url.trim()).filter(Boolean) };
    const next = { ...named, slug: uniqueLivingSlug(named, guide.items), updatedAt: new Date().toISOString() };
    const exists = guide.items.some((item) => item.id === next.id);
    setSaving(true);
    try { await persist({ ...guide, items: exists ? guide.items.map((item) => item.id === next.id ? next : item) : [...guide.items, next] }); setEditing(next); setOriginal(JSON.stringify(next)); setNotice(savedNotice(category ? "Guardado." : "Guardado sin categoría (no se publica).")); }
    catch (error) { setNotice(`No se pudo guardar: ${describeError(error)}`); }
    finally { setSaving(false); }
  };
  const toggleFeatured = async (item: LivingItem) => {
    const category = categoryOf(item);
    if (!category || category.format !== "resort") return;
    const featuredId = category.featuredId === item.id ? "" : item.id;
    try { await persist({ ...guide, categories: guide.categories.map((entry) => entry.id === category.id ? { ...entry, featuredId } : entry) }); setNotice(featuredId ? savedNotice(`“${item.name}” es ahora el LIGHT Pick · N.º 1 de ${category.label}.`) : `“${item.name}” ya no está destacado: se muestra el primero de la lista.`); }
    catch (error) { setNotice(`No se pudo destacar: ${describeError(error)}`); }
  };
  const remove = async (item: LivingItem) => {
    if (!window.confirm(`¿Eliminar “${item.name || "Sin nombre"}” de Living?`)) return;
    try { await persist({ ...guide, items: guide.items.filter((current) => current.id !== item.id), categories: guide.categories.map((category) => category.featuredId === item.id ? { ...category, featuredId: "" } : category) }); if (editing?.id === item.id) setEditing(null); setNotice("Lugar eliminado."); }
    catch (error) { setNotice(`No se pudo eliminar: ${describeError(error)}`); }
  };
  const newItem = () => open(blankLivingItem(guide.categories.find((category) => category.id === filter) || guide.categories[0] || null));

  if (editing) {
    const category = categoryOf(editing);
    const detailed = category?.format === "resort";
    const isNew = !guide.items.some((item) => item.id === editing.id);
    const featured = isFeatured(editing) || (isNew && detailed && !guide.items.some((item) => item.categoryId === editing.categoryId));
    const singular = category?.singular || "lugar";
    const editItem = { ...editing, kind: category?.format || editing.kind };
    const editGuide = { ...guide, items: isNew ? [...guide.items, editItem] : guide.items.map((item) => item.id === editItem.id ? editItem : item) };
    const editCategory: LivingCategory = category || { id: "", label: "Sin categoría", singular: "Lugar", title: "", format: editing.kind === "resort" ? "resort" : "mesa", detailLabel: editing.kind === "resort" ? "Ideal para" : "Lo imprescindible", featuredId: "" };
    return <section className="runway-studio runway-studio--edit place-studio">
      <header className="runway-studio__head">
        <button type="button" className="runway-studio__back" onClick={close}><ArrowLeft size={15} /> Living</button>
        <div><p className="eyebrow">Living / {category?.label || "Sin categoría"}</p><h2>{editing.name || `Nuevo: ${singular.toLowerCase()}`}</h2></div>
        {!isNew && category && <a className="admin-secondary runway-studio__view" href={livingHref(guide.items.find((item) => item.id === editing.id) || editing)} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /> Ver su hoja</a>}
      </header>
      <div className="place-editor">
        <div className="place-editor__controls">
          <fieldset className="admin-fieldset place-editor__fields" disabled={readOnly}>
            <label>Categoría<select value={category ? editing.categoryId : NONE} onChange={(event) => { const next = guide.categories.find((entry) => entry.id === event.target.value); update({ categoryId: next?.id || "", kind: next?.format || editing.kind }); }}>{guide.categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}<option value={NONE}>Sin categoría (no se publica)</option></select></label>
            <label>Dirección<span className="living-sheet__slug"><b>/living/</b><input value={editing.slug} onChange={(event) => update({ slug: event.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder={livingSlugify(editing.name) || "con-el-nombre"} /></span></label>
            <div className="place-editor__add"><span>Añadir a la reseña</span><div><button type="button" onClick={() => addBlock({ type: "text", text: "" })}><Type size={14} /> Párrafo</button><button type="button" onClick={() => addBlock({ type: "heading", text: "" })}><Heading size={14} /> Subtítulo</button><button type="button" onClick={() => addBlock({ type: "image", src: "", caption: "" })}><ImagePlus size={14} /> Imagen</button><button type="button" onClick={() => addBlock({ type: "quote", text: "" })}><Quote size={14} /> Cita</button></div></div>
          </fieldset>
          {category ? <button type="button" className="admin-secondary place-editor__preview" onClick={() => setCleanPreview(true)}><Eye size={14} /> Vista previa limpia</button> : <p className="living-sheet__note">Sin categoría: no se publica hasta que le asignes una.</p>}
        </div>
        <p className="place-editor__hint">{readOnly ? "Solo lectura." : "Haz clic en cualquier texto o imagen de la hoja para cambiarlo. Los bloques de la reseña se suben, bajan o quitan con la barra que aparece al pasar el ratón."}</p>
        <div className="place-editor__paper" onClickCapture={keepLinksInPlace} ref={paperRef}>
          <div className="site-shell living-page living-guide lgd"><LivingItemView guide={editGuide} item={editItem} category={editCategory} edit={readOnly ? undefined : { update, blocks, setBlocks }} /></div>
        </div>
      </div>
      {cleanPreview && category && <FullscreenPreview onClose={() => setCleanPreview(false)}><div className="site-shell living-page living-guide lgd"><LivingHeader /><LivingItemView guide={editGuide} item={editItem} category={category} /></div></FullscreenPreview>}
      {!readOnly && <footer className="runway-studio__savebar"><span className={dirty ? "is-dirty" : ""}>{notice || (dirty ? "Cambios sin guardar" : "Todo guardado")}</span><div>{!isNew && detailed && <button className="admin-secondary" type="button" onClick={() => void toggleFeatured(editing)}><Star size={14} fill={category?.featuredId === editing.id ? "currentColor" : "none"} /> {category?.featuredId === editing.id ? "Quitar destacado" : "Destacar"}</button>}<button className="admin-secondary" type="button" onClick={close}>Cerrar</button><button className="admin-primary" type="button" onClick={() => void save()} disabled={saving || !dirty}><Save size={15} /> {saving ? "Guardando…" : "Guardar"}</button></div></footer>}
    </section>;
  }

  const tabs: [string, string][] = [["todo", `Todo · ${guide.items.length}`], ...guide.categories.map((category) => [category.id, `${category.label || "Sin nombre"} · ${counts[category.id] || 0}`] as [string, string]), ...(counts[NONE] ? [[NONE, `Sin categoría · ${counts[NONE]}`] as [string, string]] : [])];
  return <section className="runway-studio">
    <header className="runway-studio__head runway-studio__head--list">
      <div><p className="eyebrow">LIGHT / Living</p><h2>The Guide.</h2><p className="runway-studio__dek">La guía de los mejores lugares de la ciudad. Crea las categorías que necesites (restaurantes, locales, peluquerías…): cada una es una sección de la hoja Living. Los eventos van en la hoja Eventos.</p></div>
      <div className="living-studio__add"><button className="admin-secondary" type="button" onClick={() => setShowCategories((value) => !value)} aria-expanded={showCategories}><Settings2 size={15} /> Categorías · {guide.categories.length}</button>{!readOnly && <button className="admin-primary" type="button" onClick={newItem}><Plus size={15} /> Nuevo lugar</button>}</div>
    </header>
    {showCategories && <CategoriesPanel guide={guide} readOnly={readOnly} onSave={saveCategories} onClose={() => setShowCategories(false)} />}
    <div className="runway-studio__toolbar">
      <label className="runway-studio__search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, zona o texto" aria-label="Buscar en Living" /></label>
      <div className="runway-studio__cities" role="tablist" aria-label="Categoría">{tabs.map(([id, label]) => <button type="button" role="tab" aria-selected={filter === id} className={filter === id ? "is-active" : ""} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div>
      <span className="runway-studio__count">{visible.length} {visible.length === 1 ? "lugar" : "lugares"}</span>
    </div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {filter === NONE && <p className="living-sheet__note">Estos lugares no se publican. Ábrelos para asignarles una categoría o elimínalos.</p>}
    {visible.length ? <div className="runway-studio__grid living-studio__grid">{visible.map((item) => { const category = categoryOf(item); const featured = isFeatured(item); return <article className={`runway-card-admin living-card-admin${featured ? " is-featured" : ""}${category ? "" : " is-unpublished"}`} key={item.id}>
      <button type="button" className="runway-card-admin__cover" onClick={() => open(item)} aria-label={`${readOnly ? "Ver" : "Editar"} ${item.name}`}>{item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="runway-card-admin__empty"><ImageOff size={20} /></span>}{featured && <span className="lg-badge">LIGHT Pick · N.º 1</span>}<span className="runway-card-admin__season">{category ? category.singular : "Sin categoría · no se publica"}{item.place || item.category ? ` · ${item.place || item.category}` : ""}</span></button>
      <div className="runway-card-admin__body"><h3>{item.name || "Sin nombre"}</h3><div className="living-card-admin__rating"><Rating value={livingScoreOf(item)} size="sm" /></div>{item.verdict && <p>{item.verdict}</p>}</div>
      <div className="runway-card-admin__actions"><button type="button" onClick={() => open(item)}><Pencil size={13} /> {readOnly ? "Ver" : "Editar"}</button>{!readOnly && category?.format === "resort" && <button type="button" className={category.featuredId === item.id ? "is-on" : ""} onClick={() => void toggleFeatured(item)} title={category.featuredId === item.id ? "Quitar destacado" : "Destacar como LIGHT Pick · N.º 1"} aria-pressed={category.featuredId === item.id}><Star size={13} fill={category.featuredId === item.id ? "currentColor" : "none"} /> {category.featuredId === item.id ? "Destacado" : "Destacar"}</button>}{category && <a href={livingHref(item)} target="_blank" rel="noreferrer" aria-label={`Abrir la hoja de ${item.name}`}><ArrowUpRight size={14} /></a>}{!readOnly && <button type="button" onClick={() => void remove(item)} aria-label={`Eliminar ${item.name}`}><Trash2 size={13} /></button>}</div>
    </article>; })}</div> : <p className="runway-studio__empty">{guide.items.length ? "Nada coincide con la búsqueda." : "Todavía no hay lugares en Living."}</p>}
  </section>;
}
