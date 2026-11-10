import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Eye, ImageOff, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { deleteRemoteRunwayBrand, saveRemoteRunwayBrand, type RunwayBrand } from "@/lib/runway";
import { describeError, supabase } from "@/lib/supabase";

const blank = (): RunwayBrand => ({ id: crypto.randomUUID(), slug: "", brand: "", city: "Paris", image: "", season: "Spring 2027 Ready-to-Wear", deck: "", text: "", tags: [], updatedAt: new Date().toISOString() });
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "marca";
const DECK_LIMIT = 160;

function RunwayLivePreview({ brand }: { brand: RunwayBrand }) { return <article className="runway-public-mirror"><div className="runway-public-mirror__top"><span>LIGHT / RUNWAY</span><span>{brand.season}</span></div><div className="runway-public-mirror__hero"><div className="runway-public-mirror__copy"><p className="eyebrow">{brand.city} / {brand.brand || "Firma"}</p><h2>{brand.brand || "Nombre de la firma"}</h2><p>{brand.deck || "La bajada editorial aparecerá aquí."}</p><div className="runway-public-mirror__tags">{brand.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><div className="runway-public-mirror__image">{brand.image ? <img src={brand.image} alt="Vista previa de la pasarela" /> : <span>Añade una imagen</span>}<small>RUNWAY / 06</small></div></div><div className="runway-public-mirror__editorial"><div><p className="eyebrow">La mirada LIGHT</p><p>{brand.text || "El texto editorial aparecerá aquí."}</p></div><div><span>Marca</span><strong>{brand.brand || "—"}</strong><span>Ciudad</span><strong>{brand.city || "—"}</strong><span>Temporada</span><strong>{brand.season || "—"}</strong></div></div></article>; }

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
  const [saving, setSaving] = useState(false);
  const cities = useMemo(() => ["Todas", ...[...new Set(brands.map((brand) => brand.city).filter(Boolean))].sort()], [brands]);
  const visible = brands.filter((brand) => (city === "Todas" || brand.city === city) && `${brand.brand} ${brand.season} ${brand.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
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
      <div><p className="eyebrow">Runway / {brands.some((item) => item.id === editing.id) ? "Ficha de la firma" : "Nueva firma"}</p><h2>{editing.brand || "Nueva firma"}</h2></div>
      {editing.slug && <a className="admin-secondary runway-studio__view" href={`/runway/${editing.slug}`} target="_blank" rel="noreferrer"><Eye size={14} /> Ver publicada</a>}
    </header>
    <div className="runway-studio__editor">
      <fieldset className="runway-sheet" disabled={readOnly}>
        <section><h3><span>01</span> Identidad</h3><div className="runway-sheet__grid"><label className="runway-sheet__wide">Nombre de la firma<input value={editing.brand} onChange={(event) => update({ brand: event.target.value })} placeholder="Maison…" autoFocus={!editing.brand} /></label><label>Ciudad<input value={editing.city} onChange={(event) => update({ city: event.target.value })} placeholder="Paris" list="runway-cities" /></label><label>Temporada<input value={editing.season} onChange={(event) => update({ season: event.target.value })} placeholder="Spring 2027 Ready-to-Wear" /></label></div><datalist id="runway-cities">{cities.filter((item) => item !== "Todas").map((item) => <option value={item} key={item} />)}</datalist></section>
        <section><h3><span>02</span> Imagen de pasarela</h3><div className="runway-sheet__image"><div className="runway-sheet__thumb">{editing.image ? <img src={editing.image} alt="" /> : <ImageOff size={20} />}</div><label>URL de la imagen<input value={editing.image} onChange={(event) => update({ image: event.target.value })} placeholder="https://…" /><small>Usa una foto vertical de la colección (3:4 o 4:5).</small></label></div></section>
        <section><h3><span>03</span> Texto</h3><label>Bajada<textarea value={editing.deck} maxLength={DECK_LIMIT * 2} onChange={(event) => update({ deck: event.target.value })} rows={3} placeholder="Una frase que resume la colección." /><small className={editing.deck.length > DECK_LIMIT ? "is-over" : ""}>{editing.deck.length} / {DECK_LIMIT} recomendados</small></label><label>La mirada LIGHT<textarea value={editing.text} onChange={(event) => update({ text: event.target.value })} rows={6} placeholder="Qué propone la colección, cómo se mueve, qué la hace distinta." /></label></section>
        <section><h3><span>04</span> Etiquetas</h3><TagInput tags={editing.tags} onChange={(tags) => update({ tags })} /></section>
      </fieldset>
      <aside className="runway-studio__preview"><p className="eyebrow">Vista previa en vivo</p><RunwayLivePreview brand={editing} /></aside>
    </div>
    {!readOnly && <footer className="runway-studio__savebar"><span className={dirty ? "is-dirty" : ""}>{notice || (dirty ? "Cambios sin guardar" : "Todo guardado")}</span><div><button className="admin-secondary" type="button" onClick={close}>Cerrar</button><button className="admin-primary" type="button" onClick={() => void save()} disabled={saving || !dirty}><Save size={15} /> {saving ? "Guardando…" : "Guardar firma"}</button></div></footer>}
  </section>;

  return <section className="runway-studio">
    <header className="runway-studio__head runway-studio__head--list">
      <div><p className="eyebrow">LIGHT / Runway</p><h2>Firmas y pasarelas.</h2><p className="runway-studio__dek">Cada firma que pasa por pasarela, documentada con su temporada, su imagen y la mirada de LIGHT.</p></div>
      {!readOnly && <button className="admin-primary" type="button" onClick={() => open(blank())}><Plus size={15} /> Añadir firma</button>}
    </header>
    <div className="runway-studio__toolbar">
      <label className="runway-studio__search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar firma, temporada o etiqueta" aria-label="Buscar firma" /></label>
      <div className="runway-studio__cities" role="tablist" aria-label="Ciudad">{cities.map((item) => <button type="button" role="tab" aria-selected={city === item} className={city === item ? "is-active" : ""} key={item} onClick={() => setCity(item)}>{item}</button>)}</div>
      <span className="runway-studio__count">{visible.length} {visible.length === 1 ? "firma" : "firmas"}</span>
    </div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {visible.length ? <div className="runway-studio__grid">{visible.map((brand) => <article className="runway-card-admin" key={brand.id}>
      <button type="button" className="runway-card-admin__cover" onClick={() => open(brand)} aria-label={`${readOnly ? "Ver" : "Editar"} ${brand.brand}`}>{brand.image ? <img src={brand.image} alt="" loading="lazy" /> : <span className="runway-card-admin__empty"><ImageOff size={20} /></span>}<span className="runway-card-admin__season">{brand.city} · {brand.season}</span></button>
      <div className="runway-card-admin__body"><h3>{brand.brand}</h3>{brand.deck && <p>{brand.deck}</p>}{brand.tags.length > 0 && <div className="runway-card-admin__tags">{brand.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>}</div>
      <div className="runway-card-admin__actions"><button type="button" onClick={() => open(brand)}><Pencil size={13} /> {readOnly ? "Ver" : "Editar"}</button><a href={`/runway/${brand.slug}`} target="_blank" rel="noreferrer" aria-label={`Ver ${brand.brand} publicada`}><ArrowUpRight size={14} /></a>{!readOnly && <button type="button" onClick={() => void remove(brand)} aria-label={`Eliminar ${brand.brand}`}><Trash2 size={13} /></button>}</div>
    </article>)}</div> : <p className="runway-studio__empty">{brands.length ? "Ninguna firma coincide con la búsqueda." : "Todavía no hay firmas en Runway."}</p>}
  </section>;
}
