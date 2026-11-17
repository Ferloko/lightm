import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Eye, FolderPlus, ImageOff, Menu, Pencil, Plus, Save, Search, Settings2, Trash2, X } from "lucide-react";
import PagePreview from "@/components/PagePreview";
import { BrandView } from "@/pages/BrandPage";
import { blankRunwayCategory, deleteRemoteRunwayBrand, saveRemoteRunwayBrand, saveRunwayCategories, useRunwayCategories, type RunwayBrand, type RunwayCategory } from "@/lib/runway";
import { describeError, supabase } from "@/lib/supabase";

const blank = (categoryId: string): RunwayBrand => ({ id: crypto.randomUUID(), slug: "", categoryId, brand: "", city: "Paris", image: "", season: "Spring 2027 Ready-to-Wear", deck: "", text: "", tags: [], updatedAt: new Date().toISOString() });
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "marca";
const DECK_LIMIT = 160;
const ALL = "todas", NONE = "__none__";

/** La hoja pública de la firma, con su cabecera, para la vista previa en vivo. */
function RunwayPagePreview({ brand, category }: { brand: RunwayBrand; category: RunwayCategory | null }) {
  return <PagePreview><div className="site-shell brand-page">
    <header className="site-header"><div className="topline"><span className="header-action"><Menu size={20} /><span>Menú</span></span><p>Antes de que esté de moda, está en LIGHT</p><span className="header-action"><Search size={19} strokeWidth={1.4} /><span>Buscar</span></span></div><div className="brand-row"><span className="wordmark">LIGHT</span></div><nav className="main-nav"><span>Moda</span><span>Belleza</span><span>Eventos</span><span>Living</span><span className="nav-active">Runway</span><span>La revista</span></nav></header>
    <BrandView brand={{ ...brand, brand: brand.brand || "Nombre de la firma", deck: brand.deck || "La bajada editorial aparecerá aquí.", text: brand.text || "El texto editorial aparecerá aquí." }} category={category} />
  </div></PagePreview>;
}

/** Crear, renombrar, ordenar y borrar las categorías de Runway. */
function RunwayCategoriesPanel({ categories, brands, readOnly, onClose }: { categories: RunwayCategory[]; brands: RunwayBrand[]; readOnly: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<RunwayCategory[]>(categories);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(categories);
  const count = (id: string) => brands.filter((brand) => brand.categoryId === id).length;
  const update = (id: string, patch: Partial<RunwayCategory>) => setDraft((list) => list.map((category) => category.id === id ? { ...category, ...patch } : category));
  const move = (index: number, direction: -1 | 1) => setDraft((list) => { const target = index + direction; if (target < 0 || target >= list.length) return list; const next = [...list]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const remove = (category: RunwayCategory) => {
    const n = count(category.id);
    if (!window.confirm(n ? `“${category.label}” tiene ${n} ${n === 1 ? "firma" : "firmas"}. Si la borras, quedan “Sin categoría” (siguen publicadas en “Todas”). ¿Borrar la categoría?` : `¿Borrar la categoría “${category.label || "sin nombre"}”?`)) return;
    setDraft((list) => list.filter((item) => item.id !== category.id));
  };
  const save = async () => {
    const cleaned = draft.map((category) => ({ ...category, label: category.label.trim(), title: category.title.trim(), dek: category.dek.trim() }));
    if (cleaned.some((category) => !category.label)) { setError("Cada categoría necesita un nombre."); return; }
    setSaving(true); setError("");
    try { await saveRunwayCategories(cleaned); onClose(); } catch (cause) { setError(`No se pudo guardar: ${describeError(cause)}`); } finally { setSaving(false); }
  };
  return <section className="living-categories" aria-label="Categorías de Runway">
    <header><div><p className="eyebrow">Runway</p><h3>Categorías</h3><p>Cada categoría es un filtro de la hoja Runway, en este orden. Las que no tienen firmas no se muestran.</p></div><button type="button" className="admin-secondary" onClick={() => { if (!dirty || window.confirm("¿Descartar los cambios en las categorías?")) onClose(); }}>Cerrar</button></header>
    <fieldset className="admin-fieldset" disabled={readOnly}>
      <ol className="living-categories__list">{draft.map((category, index) => <li key={category.id}>
        <span className="living-categories__index">{String(index + 1).padStart(2, "0")}</span>
        <div className="living-categories__fields">
          <label>Nombre<input value={category.label} onChange={(event) => update(category.id, { label: event.target.value })} placeholder="Alta costura" /></label>
          <label>Titular de la hoja<input value={category.title} onChange={(event) => update(category.id, { title: event.target.value })} placeholder="Fall 2027 Couture" /><small>Se ve grande en Runway al elegir la categoría.</small></label>
          <label className="living-categories__wide">Bajada<input value={category.dek} onChange={(event) => update(category.id, { dek: event.target.value })} placeholder="Una frase bajo el titular." /></label>
        </div>
        <div className="living-categories__actions"><span>{count(category.id)} {count(category.id) === 1 ? "firma" : "firmas"}</span><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir"><ArrowUp size={13} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label="Bajar"><ArrowDown size={13} /></button><button type="button" onClick={() => remove(category)} aria-label={`Borrar ${category.label}`}><Trash2 size={13} /></button></div>
      </li>)}</ol>
      {draft.length === 0 && <p className="living-sheet__note">No hay categorías: Runway muestra todas las firmas juntas.</p>}
      {!readOnly && <div className="living-categories__foot"><button type="button" className="admin-secondary" onClick={() => setDraft((list) => [...list, blankRunwayCategory()])}><FolderPlus size={14} /> Nueva categoría</button><span>{error}</span><button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || !dirty}><Save size={14} /> {saving ? "Guardando…" : "Guardar categorías"}</button></div>}
    </fieldset>
  </section>;
}

/** Tags as chips: Enter or comma adds one, × removes it. */
function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [value, setValue] = useState("");
  const add = () => { const next = value.split(",").map((tag) => tag.trim()).filter(Boolean).filter((tag) => !tags.some((current) => current.toLowerCase() === tag.toLowerCase())); if (next.length) onChange([...tags, ...next]); setValue(""); };
  return <div className="runway-tags">{tags.map((tag) => <span key={tag}>{tag}<button type="button" onClick={() => onChange(tags.filter((item) => item !== tag))} aria-label={`Quitar ${tag}`}><X size={11} /></button></span>)}<input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(); } else if (event.key === "Backspace" && !value && tags.length) onChange(tags.slice(0, -1)); }} onBlur={add} placeholder={tags.length ? "Añadir…" : "Paris, Tailoring, Night…"} aria-label="Añadir etiqueta" /></div>;
}

export default function RunwayManager({ brands, onChange, readOnly = false }: { brands: RunwayBrand[]; onChange: (brands: RunwayBrand[]) => void; readOnly?: boolean }) {
  const [editing, setEditing] = useState<RunwayBrand | null>(null);
  const [original, setOriginal] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Todas");
  const [filter, setFilter] = useState(ALL);
  const [saving, setSaving] = useState(false);
  const [categories] = useRunwayCategories();
  const [showCategories, setShowCategories] = useState(false);
  const categoryOf = (brand: RunwayBrand) => categories.find((category) => category.id === brand.categoryId) || null;
  const counts = useMemo(() => { const result: Record<string, number> = {}; brands.forEach((brand) => { const key = categories.some((category) => category.id === brand.categoryId) ? brand.categoryId : NONE; result[key] = (result[key] || 0) + 1; }); return result; }, [brands, categories]);
  useEffect(() => { if (filter !== ALL && filter !== NONE && !categories.some((category) => category.id === filter)) setFilter(ALL); }, [categories, filter]);
  const cities = useMemo(() => ["Todas", ...[...new Set(brands.map((brand) => brand.city).filter(Boolean))].sort()], [brands]);
  const visible = brands.filter((brand) => (filter === ALL || (filter === NONE ? !categoryOf(brand) : brand.categoryId === filter)) && (city === "Todas" || brand.city === city) && `${brand.brand} ${brand.season} ${brand.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const open = (brand: RunwayBrand) => { setEditing(brand); setOriginal(JSON.stringify(brand)); setNotice(""); };
  const dirty = editing ? JSON.stringify(editing) !== original : false;
  const close = () => { if (dirty && !readOnly && !window.confirm("Hay cambios sin guardar en esta firma. ¿Salir de todos modos?")) return; setEditing(null); setNotice(""); };
  const update = (patch: Partial<RunwayBrand>) => setEditing((current) => current ? { ...current, ...patch } : current);
  const save = async () => {
    if (!editing?.brand.trim()) { setNotice("Añade el nombre de la firma."); return; }
    const baseSlug = slugify(editing.slug || editing.brand);
    const slug = brands.some((item) => item.id !== editing.id && item.slug === baseSlug) ? `${baseSlug}-${editing.id.slice(0, 4)}` : baseSlug;
    const next = { ...editing, slug, updatedAt: new Date().toISOString() };
    setSaving(true);
    try { await saveRemoteRunwayBrand(next, brands); onChange([next, ...brands.filter((item) => item.id !== next.id)]); setEditing(next); setOriginal(JSON.stringify(next)); setNotice(supabase ? "Firma guardada. Ya la ve todo el equipo y el público." : "Firma guardada en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudo guardar la firma: ${describeError(error)}`); }
    finally { setSaving(false); }
  };
  const remove = async (brand: RunwayBrand) => {
    if (!window.confirm(`¿Eliminar “${brand.brand}” de Runway?`)) return;
    try { await deleteRemoteRunwayBrand(brand.id, brands); onChange(brands.filter((item) => item.id !== brand.id)); if (editing?.id === brand.id) setEditing(null); setNotice("Firma eliminada."); }
    catch (error) { setNotice(`No se pudo eliminar: ${describeError(error)}`); }
  };

  if (editing) return <section className="runway-studio runway-studio--edit">
    <header className="runway-studio__head">
      <button type="button" className="runway-studio__back" onClick={close}><ArrowLeft size={15} /> Firmas</button>
      <div><p className="eyebrow">Runway / {categoryOf(editing)?.label || "Sin categoría"} / {brands.some((item) => item.id === editing.id) ? "Ficha de la firma" : "Nueva firma"}</p><h2>{editing.brand || "Nueva firma"}</h2></div>
      {editing.slug && <a className="admin-secondary runway-studio__view" href={`/runway/${editing.slug}`} target="_blank" rel="noreferrer"><Eye size={14} /> Ver publicada</a>}
    </header>
    <div className="runway-studio__editor">
      <fieldset className="runway-sheet" disabled={readOnly}>
        <section><h3><span>01</span> Identidad</h3><div className="runway-sheet__grid"><label className="runway-sheet__wide">Nombre de la firma<input value={editing.brand} onChange={(event) => update({ brand: event.target.value })} placeholder="Maison…" autoFocus={!editing.brand} /></label><label className="runway-sheet__wide">Categoría<select value={categoryOf(editing) ? editing.categoryId : NONE} onChange={(event) => update({ categoryId: event.target.value === NONE ? "" : event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}<option value={NONE}>Sin categoría (solo en “Todas”)</option></select></label><label>Ciudad<input value={editing.city} onChange={(event) => update({ city: event.target.value })} placeholder="Paris" list="runway-cities" /></label><label>Temporada<input value={editing.season} onChange={(event) => update({ season: event.target.value })} placeholder="Spring 2027 Ready-to-Wear" /></label></div><datalist id="runway-cities">{cities.filter((item) => item !== "Todas").map((item) => <option value={item} key={item} />)}</datalist></section>
        <section><h3><span>02</span> Imagen de pasarela</h3><div className="runway-sheet__image"><div className="runway-sheet__thumb">{editing.image ? <img src={editing.image} alt="" /> : <ImageOff size={20} />}</div><label>URL de la imagen<input value={editing.image} onChange={(event) => update({ image: event.target.value })} placeholder="https://…" /><small>Usa una foto vertical de la colección (3:4 o 4:5).</small></label></div></section>
        <section><h3><span>03</span> Texto</h3><label>Bajada<textarea value={editing.deck} maxLength={DECK_LIMIT * 2} onChange={(event) => update({ deck: event.target.value })} rows={3} placeholder="Una frase que resume la colección." /><small className={editing.deck.length > DECK_LIMIT ? "is-over" : ""}>{editing.deck.length} / {DECK_LIMIT} recomendados</small></label><label>La mirada LIGHT<textarea value={editing.text} onChange={(event) => update({ text: event.target.value })} rows={6} placeholder="Qué propone la colección, cómo se mueve, qué la hace distinta." /></label></section>
        <section><h3><span>04</span> Etiquetas</h3><TagInput tags={editing.tags} onChange={(tags) => update({ tags })} /></section>
      </fieldset>
      <aside className="runway-studio__preview"><RunwayPagePreview brand={editing} category={categoryOf(editing)} /></aside>
    </div>
    {!readOnly && <footer className="runway-studio__savebar"><span className={dirty ? "is-dirty" : ""}>{notice || (dirty ? "Cambios sin guardar" : "Todo guardado")}</span><div><button className="admin-secondary" type="button" onClick={close}>Cerrar</button><button className="admin-primary" type="button" onClick={() => void save()} disabled={saving || !dirty}><Save size={15} /> {saving ? "Guardando…" : "Guardar firma"}</button></div></footer>}
  </section>;

  const tabs: [string, string][] = [[ALL, `Todas · ${brands.length}`], ...categories.map((category) => [category.id, `${category.label} · ${counts[category.id] || 0}`] as [string, string]), ...(counts[NONE] ? [[NONE, `Sin categoría · ${counts[NONE]}`] as [string, string]] : [])];
  return <section className="runway-studio">
    <header className="runway-studio__head runway-studio__head--list">
      <div><p className="eyebrow">LIGHT / Runway</p><h2>Firmas y pasarelas.</h2><p className="runway-studio__dek">Cada firma que pasa por pasarela, documentada con su temporada, su imagen y la mirada de LIGHT.</p></div>
      <div className="living-studio__add"><button className="admin-secondary" type="button" onClick={() => setShowCategories((value) => !value)} aria-expanded={showCategories}><Settings2 size={15} /> Categorías · {categories.length}</button>{!readOnly && <button className="admin-primary" type="button" onClick={() => open(blank(categories.find((category) => category.id === filter)?.id || categories[0]?.id || ""))}><Plus size={15} /> Añadir firma</button>}</div>
    </header>
    {showCategories && <RunwayCategoriesPanel categories={categories} brands={brands} readOnly={readOnly} onClose={() => setShowCategories(false)} />}
    <div className="runway-studio__toolbar">
      <label className="runway-studio__search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar firma, temporada o etiqueta" aria-label="Buscar firma" /></label>
      <div className="runway-studio__cities" role="tablist" aria-label="Categoría">{tabs.map(([id, label]) => <button type="button" role="tab" aria-selected={filter === id} className={filter === id ? "is-active" : ""} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div>
      <label className="runway-studio__city"><span>Ciudad</span><select value={city} onChange={(event) => setCity(event.target.value)}>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <span className="runway-studio__count">{visible.length} {visible.length === 1 ? "firma" : "firmas"}</span>
    </div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {visible.length ? <div className="runway-studio__grid">{visible.map((brand) => <article className="runway-card-admin" key={brand.id}>
      <button type="button" className="runway-card-admin__cover" onClick={() => open(brand)} aria-label={`${readOnly ? "Ver" : "Editar"} ${brand.brand}`}>{brand.image ? <img src={brand.image} alt="" loading="lazy" /> : <span className="runway-card-admin__empty"><ImageOff size={20} /></span>}<span className="runway-card-admin__season">{[categoryOf(brand)?.label || "Sin categoría", brand.city].filter(Boolean).join(" · ")}</span></button>
      <div className="runway-card-admin__body"><h3>{brand.brand}</h3>{brand.deck && <p>{brand.deck}</p>}{brand.tags.length > 0 && <div className="runway-card-admin__tags">{brand.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>}</div>
      <div className="runway-card-admin__actions"><button type="button" onClick={() => open(brand)}><Pencil size={13} /> {readOnly ? "Ver" : "Editar"}</button><a href={`/runway/${brand.slug}`} target="_blank" rel="noreferrer" aria-label={`Ver ${brand.brand} publicada`}><ArrowUpRight size={14} /></a>{!readOnly && <button type="button" onClick={() => void remove(brand)} aria-label={`Eliminar ${brand.brand}`}><Trash2 size={13} /></button>}</div>
    </article>)}</div> : <p className="runway-studio__empty">{brands.length ? "Ninguna firma coincide con la búsqueda." : "Todavía no hay firmas en Runway."}</p>}
  </section>;
}
