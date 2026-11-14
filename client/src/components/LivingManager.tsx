import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, ImageOff, Pencil, Plus, Save, Search, Star, Trash2 } from "lucide-react";
import { LivingCover, LivingNight, LivingRank, LivingReview, Rating } from "@/components/LivingCards";
import { arrangeLivingGuide, blankLivingItem, livingCriteria, livingHref, livingKinds, livingParagraphs, livingSlugify, uniqueLivingSlug, livingScoreOf, livingStatuses, saveLivingGuide, useLivingGuide, type LivingGuide, type LivingItem, type LivingKind, type LivingPrice } from "@/lib/living";
import { describeError, supabase } from "@/lib/supabase";

type KindFilter = "todo" | LivingKind;
const VERDICT_LIMIT = 180;
const kindInfo = (kind: LivingKind) => livingKinds.find((item) => item.kind === kind)!;
const labels: Record<LivingKind, { category: string; categoryHint: string; place: string; placeHint: string; verdict: string; verdictHint: string; image: string }> = {
  resort: { category: "Tipo de estancia", categoryHint: "Resort & Spa", place: "Zona", placeHint: "Costa Norte", verdict: "Veredicto LIGHT", verdictHint: "Qué hace especial a este lugar, en una o dos frases.", image: "Usa una foto horizontal (5:4 o 4:3): es la que se ve grande cuando el resort está destacado." },
  mesa: { category: "Cocina", categoryHint: "Italiana de autor", place: "Zona", placeHint: "Puerto Viejo", verdict: "Veredicto LIGHT", verdictHint: "Cómo se come y por qué volver.", image: "Una foto del plato o de la sala (horizontal)." },
  noche: { category: "Lugar", categoryHint: "Casa Aurelia · Costa Norte", place: "", placeHint: "", verdict: "Descripción", verdictHint: "Qué pasa esa noche y para quién es.", image: "Una foto horizontal del lugar o de una edición anterior." },
};

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="living-sheet__score">{label}<span><input type="range" min={0} max={5} step={0.1} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /><input type="number" min={0} max={5} step={0.1} value={value} onChange={(event) => onChange(Math.max(0, Math.min(5, Number(event.target.value) || 0)))} aria-label={`${label} (número)`} /></span></label>;
}

function PriceInput({ value, onChange }: { value: LivingPrice; onChange: (value: LivingPrice) => void }) {
  return <div className="living-sheet__price" role="radiogroup" aria-label="Precio">{([1, 2, 3, 4] as LivingPrice[]).map((level) => <button type="button" role="radio" aria-checked={value === level} className={value === level ? "is-active" : ""} key={level} onClick={() => onChange(level)}>{"$".repeat(level)}</button>)}</div>;
}

/** Vista previa con las mismas piezas (y clases) que la página pública. */
function LivingPreview({ item, featured }: { item: LivingItem; featured: boolean }) {
  return <div className="living-guide lg-admin-preview">
    <p className="eyebrow">{kindInfo(item.kind).section}{item.kind === "resort" && (featured ? " · Destacado" : " · Tarjeta")}</p>
    {item.kind === "resort" ? featured ? <LivingCover item={item} linked={false} /> : <div className="lg-grid"><LivingReview item={item} linked={false} /></div>
      : item.kind === "mesa" ? <ol className="lg-ranking"><LivingRank item={item} position={1} linked={false} /></ol>
        : <div className="lg-nights"><LivingNight item={item} linked={false} /></div>}
  </div>;
}

export default function LivingManager({ readOnly = false }: { readOnly?: boolean }) {
  const [remote] = useLivingGuide();
  const [guide, setGuide] = useState<LivingGuide>(remote);
  useEffect(() => { setGuide(remote); }, [remote]);
  const [editing, setEditing] = useState<LivingItem | null>(null);
  const [original, setOriginal] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<KindFilter>("todo");
  const [saving, setSaving] = useState(false);

  const { cover } = arrangeLivingGuide(guide);
  const isFeatured = (item: LivingItem) => item.kind === "resort" && cover?.id === item.id;
  const counts = useMemo(() => Object.fromEntries(livingKinds.map(({ kind }) => [kind, guide.items.filter((item) => item.kind === kind).length])) as Record<LivingKind, number>, [guide.items]);
  const visible = guide.items.filter((item) => (filter === "todo" || item.kind === filter) && `${item.name} ${item.category} ${item.place} ${item.verdict}`.toLowerCase().includes(query.trim().toLowerCase()));
  const open = (item: LivingItem) => { setEditing(item); setOriginal(JSON.stringify(item)); setNotice(""); };
  const dirty = editing ? JSON.stringify(editing) !== original : false;
  const close = () => { if (dirty && !readOnly && !window.confirm("Hay cambios sin guardar en este elemento. ¿Salir de todos modos?")) return; setEditing(null); setNotice(""); };
  const update = (patch: Partial<LivingItem>) => setEditing((current) => current ? { ...current, ...patch } : current);
  const savedNotice = (what: string) => supabase ? `${what} Ya lo ve todo el equipo y el público.` : `${what} (guardado en este navegador de demostración).`;

  const persist = async (next: LivingGuide) => {
    await saveLivingGuide(next);
    setGuide(next);
  };
  const save = async () => {
    if (!editing?.name.trim()) { setNotice("Añade un nombre."); return; }
    const named = { ...editing, name: editing.name.trim(), gallery: editing.gallery.map((url) => url.trim()).filter(Boolean) };
    const next = { ...named, slug: uniqueLivingSlug(named, guide.items), updatedAt: new Date().toISOString() };
    const exists = guide.items.some((item) => item.id === next.id);
    setSaving(true);
    try { await persist({ ...guide, items: exists ? guide.items.map((item) => item.id === next.id ? next : item) : [...guide.items, next] }); setEditing(next); setOriginal(JSON.stringify(next)); setNotice(savedNotice("Guardado.")); }
    catch (error) { setNotice(`No se pudo guardar: ${describeError(error)}`); }
    finally { setSaving(false); }
  };
  const toggleFeatured = async (item: LivingItem) => {
    if (item.kind !== "resort") return;
    const featuredId = guide.featuredId === item.id ? "" : item.id;
    try { await persist({ ...guide, featuredId }); setNotice(featuredId ? savedNotice(`“${item.name}” es ahora el LIGHT Pick · N.º 1.`) : `“${item.name}” ya no está destacado: se muestra el primer resort de la lista.`); }
    catch (error) { setNotice(`No se pudo destacar: ${describeError(error)}`); }
  };
  const remove = async (item: LivingItem) => {
    if (!window.confirm(`¿Eliminar “${item.name || "Sin nombre"}” de Living?`)) return;
    try { await persist({ ...guide, items: guide.items.filter((current) => current.id !== item.id), featuredId: guide.featuredId === item.id ? "" : guide.featuredId }); if (editing?.id === item.id) setEditing(null); setNotice("Elemento eliminado."); }
    catch (error) { setNotice(`No se pudo eliminar: ${describeError(error)}`); }
  };

  if (editing) {
    const info = kindInfo(editing.kind);
    const text = labels[editing.kind];
    const isNew = !guide.items.some((item) => item.id === editing.id);
    const featured = isFeatured(editing) || (isNew && editing.kind === "resort" && !guide.items.some((item) => item.kind === "resort"));
    return <section className="runway-studio runway-studio--edit">
      <header className="runway-studio__head">
        <button type="button" className="runway-studio__back" onClick={close}><ArrowLeft size={15} /> Living</button>
        <div><p className="eyebrow">Living / {isNew ? `Nuevo: ${info.singular.toLowerCase()}` : info.singular}</p><h2>{editing.name || `Nuevo ${info.singular.toLowerCase()}`}</h2></div>
        {!isNew && <a className="admin-secondary runway-studio__view" href={livingHref(guide.items.find((item) => item.id === editing.id) || editing)} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /> Ver su hoja</a>}
      </header>
      <div className="runway-studio__editor">
        <fieldset className="runway-sheet" disabled={readOnly}>
          <section><h3><span>01</span> Identidad</h3><div className="runway-sheet__grid">
            <label className="runway-sheet__wide">Nombre<input value={editing.name} onChange={(event) => update({ name: event.target.value })} placeholder={editing.kind === "resort" ? "Casa Aurelia" : editing.kind === "mesa" ? "Osteria Lume" : "Casa LIGHT"} autoFocus={!editing.name} /></label>
            <label className={text.place ? "" : "runway-sheet__wide"}>{text.category}<input value={editing.category} onChange={(event) => update({ category: event.target.value })} placeholder={text.categoryHint} /></label>
            {text.place && <label>{text.place}<input value={editing.place} onChange={(event) => update({ place: event.target.value })} placeholder={text.placeHint} /></label>}
            {editing.kind === "noche" && <label>Fecha<input value={editing.date} onChange={(event) => update({ date: event.target.value })} placeholder="12—15 JUN" /></label>}
            {editing.kind === "noche" && <label>Estado<select value={editing.status} onChange={(event) => update({ status: event.target.value as LivingItem["status"] })}>{livingStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>}
          </div></section>
          <section><h3><span>02</span> Imagen</h3><div className="runway-sheet__image living-sheet__image"><div className="runway-sheet__thumb">{editing.image ? <img src={editing.image} alt="" /> : <ImageOff size={20} />}</div><label>URL de la imagen<input value={editing.image} onChange={(event) => update({ image: event.target.value })} placeholder="https://…" /><small>{text.image}</small></label></div></section>
          <section><h3><span>03</span> Texto</h3><label>{text.verdict}<textarea value={editing.verdict} maxLength={VERDICT_LIMIT * 2} onChange={(event) => update({ verdict: event.target.value })} rows={3} placeholder={text.verdictHint} /><small className={editing.verdict.length > VERDICT_LIMIT ? "is-over" : ""}>{editing.verdict.length} / {VERDICT_LIMIT} recomendados</small></label>
            {editing.kind === "resort" && <label>Ideal para<input value={editing.idealFor} onChange={(event) => update({ idealFor: event.target.value })} placeholder="Escapadas largas en pareja" /></label>}
            {editing.kind === "mesa" && <label>Qué pedir<input value={editing.signature} onChange={(event) => update({ signature: event.target.value })} placeholder="Tagliolini al limón y bottarga" /></label>}
          </section>
          <section><h3><span>04</span> Puntuación{editing.kind !== "noche" && " y precio"}</h3>
            {editing.kind === "resort" ? <><div className="runway-sheet__grid">{livingCriteria.map(([key, label]) => <ScoreInput key={key} label={label} value={editing.scores[key]} onChange={(value) => update({ scores: { ...editing.scores, [key]: Math.round(value * 10) / 10 } })} />)}</div><p className="living-sheet__overall">Nota final (media): <Rating value={livingScoreOf(editing)} size="sm" /></p></>
              : <ScoreInput label="Nota LIGHT" value={editing.score} onChange={(score) => update({ score: Math.round(score * 10) / 10 })} />}
            {editing.kind !== "noche" && <label>Precio<PriceInput value={editing.price} onChange={(price) => update({ price })} /></label>}
          </section>
          <section><h3><span>05</span> Hoja del {info.singular.toLowerCase()}</h3>
            <p className="living-sheet__note">Al hacer clic en la tarjeta, el público abre esta hoja con la reseña completa, la ficha y la galería.</p>
            <label>Dirección de la hoja<span className="living-sheet__slug"><b>/living/</b><input value={editing.slug} onChange={(event) => update({ slug: event.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder={livingSlugify(editing.name) || "se-crea-con-el-nombre"} /></span><small>Se crea con el nombre si la dejas vacía. Si la cambias, los enlaces antiguos dejan de funcionar.</small></label>
            <label>Ubicación<input value={editing.location} onChange={(event) => update({ location: event.target.value })} placeholder={editing.kind === "noche" ? "Terraza de Casa Aurelia, Costa Norte" : "Carretera de la Costa Norte, km 12"} /></label>
            <label>{editing.kind === "noche" ? "Texto completo" : "Reseña completa"}<textarea value={editing.body} onChange={(event) => update({ body: event.target.value })} rows={10} placeholder={"Cuenta la experiencia completa.\n\nDeja una línea en blanco entre párrafos."} /><small>{livingParagraphs(editing.body).length} {livingParagraphs(editing.body).length === 1 ? "párrafo" : "párrafos"} · si la dejas vacía, la hoja muestra el veredicto.</small></label>
            <label>Galería<textarea value={editing.gallery.join("\n")} onChange={(event) => update({ gallery: event.target.value.split("\n") })} rows={4} placeholder={"https://…/foto-1.jpg\nhttps://…/foto-2.jpg"} /><small>Una URL de imagen por línea.</small></label>
            {editing.gallery.some((url) => url.trim()) && <div className="living-sheet__gallery">{editing.gallery.filter((url) => url.trim()).map((url, index) => <img key={`${url}-${index}`} src={url.trim()} alt="" />)}</div>}
          </section>
        </fieldset>
        <aside className="runway-studio__preview"><p className="eyebrow">Vista previa en vivo</p><LivingPreview item={editing} featured={featured} /></aside>
      </div>
      {!readOnly && <footer className="runway-studio__savebar"><span className={dirty ? "is-dirty" : ""}>{notice || (dirty ? "Cambios sin guardar" : "Todo guardado")}</span><div>{!isNew && editing.kind === "resort" && <button className="admin-secondary" type="button" onClick={() => void toggleFeatured(editing)}><Star size={14} fill={guide.featuredId === editing.id ? "currentColor" : "none"} /> {guide.featuredId === editing.id ? "Quitar destacado" : "Destacar"}</button>}<button className="admin-secondary" type="button" onClick={close}>Cerrar</button><button className="admin-primary" type="button" onClick={() => void save()} disabled={saving || !dirty}><Save size={15} /> {saving ? "Guardando…" : "Guardar"}</button></div></footer>}
    </section>;
  }

  return <section className="runway-studio">
    <header className="runway-studio__head runway-studio__head--list">
      <div><p className="eyebrow">LIGHT / Living</p><h2>The Guide.</h2><p className="runway-studio__dek">Resorts, restaurantes y eventos de la guía Living. El resort destacado aparece arriba como “LIGHT Pick · N.º 1”.</p></div>
      {!readOnly && <div className="living-studio__add">{livingKinds.map(({ kind, singular }) => <button className={kind === "resort" ? "admin-primary" : "admin-secondary"} type="button" key={kind} onClick={() => open(blankLivingItem(kind))}><Plus size={15} /> {singular}</button>)}</div>}
    </header>
    <div className="runway-studio__toolbar">
      <label className="runway-studio__search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, zona o texto" aria-label="Buscar en Living" /></label>
      <div className="runway-studio__cities" role="tablist" aria-label="Tipo">{([["todo", "Todo"], ...livingKinds.map(({ kind, label }) => [kind, `${label} · ${counts[kind]}`])] as [KindFilter, string][]).map(([id, label]) => <button type="button" role="tab" aria-selected={filter === id} className={filter === id ? "is-active" : ""} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div>
      <span className="runway-studio__count">{visible.length} {visible.length === 1 ? "elemento" : "elementos"}</span>
    </div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {visible.length ? <div className="runway-studio__grid living-studio__grid">{visible.map((item) => { const featured = isFeatured(item); return <article className={`runway-card-admin living-card-admin${featured ? " is-featured" : ""}`} key={item.id}>
      <button type="button" className="runway-card-admin__cover" onClick={() => open(item)} aria-label={`${readOnly ? "Ver" : "Editar"} ${item.name}`}>{item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="runway-card-admin__empty"><ImageOff size={20} /></span>}{featured && <span className="lg-badge">LIGHT Pick · N.º 1</span>}<span className="runway-card-admin__season">{kindInfo(item.kind).singular} · {item.kind === "noche" ? item.date || item.category : item.place || item.category}</span></button>
      <div className="runway-card-admin__body"><h3>{item.name || "Sin nombre"}</h3><div className="living-card-admin__rating"><Rating value={livingScoreOf(item)} size="sm" /></div>{item.verdict && <p>{item.verdict}</p>}</div>
      <div className="runway-card-admin__actions"><button type="button" onClick={() => open(item)}><Pencil size={13} /> {readOnly ? "Ver" : "Editar"}</button>{!readOnly && item.kind === "resort" && <button type="button" className={guide.featuredId === item.id ? "is-on" : ""} onClick={() => void toggleFeatured(item)} title={guide.featuredId === item.id ? "Quitar destacado" : "Destacar como LIGHT Pick · N.º 1"} aria-pressed={guide.featuredId === item.id}><Star size={13} fill={guide.featuredId === item.id ? "currentColor" : "none"} /> {guide.featuredId === item.id ? "Destacado" : "Destacar"}</button>}<a href={livingHref(item)} target="_blank" rel="noreferrer" aria-label={`Abrir la hoja de ${item.name}`}><ArrowUpRight size={14} /></a>{!readOnly && <button type="button" onClick={() => void remove(item)} aria-label={`Eliminar ${item.name}`}><Trash2 size={13} /></button>}</div>
    </article>; })}</div> : <p className="runway-studio__empty">{guide.items.length ? "Nada coincide con la búsqueda." : "Todavía no hay elementos en Living."}</p>}
  </section>;
}
