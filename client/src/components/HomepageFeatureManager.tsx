import { ArrowUpRight, Link2, Monitor, RotateCcw, Save, Smartphone, Unlink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchRemoteArticles, type EditorialArticle } from "@/lib/editorial";
import { saveArchivePlacement, useArchivePlacements } from "@/lib/archivePlacements";
import { describeError, supabase } from "@/lib/supabase";
import { defaultHomepageFeature, fetchHomepageFeature, getHomepageFeature, saveHomepageFeature, type HomepageFeatureContent } from "@/lib/homepageContent";
import { safeHref } from "@/lib/utils";
import { ImageUrlFrame, InlineText } from "@/components/InlineEditing";

type Device = "desktop" | "mobile";
const fields: (keyof HomepageFeatureContent)[] = ["eyebrow", "title", "excerpt", "author", "readingTime", "asideQuote", "image", "ctaLabel", "ctaHref"];

/**
 * Destacado de la portada editado sobre su propio diseño: el bloque se ve exactamente como en
 * la portada (mismas clases y estilos) y cada texto o imagen se cambia en su sitio.
 */
export default function HomepageFeatureManager({ readOnly = false }: { readOnly?: boolean }) {
  const [value, setValue] = useState<HomepageFeatureContent>(() => getHomepageFeature());
  const [saved, setSaved] = useState<HomepageFeatureContent>(() => getHomepageFeature());
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<EditorialArticle[]>([]);
  const [notice, setNotice] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [placements] = useArchivePlacements();
  const update = (patch: Partial<HomepageFeatureContent>) => setValue((current) => ({ ...current, ...patch }));

  useEffect(() => {
    let active = true;
    void fetchHomepageFeature().then((remote) => { if (active) { setValue(remote); setSaved(remote); } });
    void fetchRemoteArticles().then((items) => { if (active) setArticles(items); });
    return () => { active = false; };
  }, []);

  // Si un artículo está asignado al espacio Feature, sus textos e imagen mandan (igual que en la portada).
  const featureArticle = useMemo(() => articles.filter((article) => article.status === "published" && article.isVisible !== false && placements[article.id]?.homeFeature).sort((a, b) => (placements[a.id]?.order || 99) - (placements[b.id]?.order || 99))[0] || null, [articles, placements]);
  const locked = Boolean(featureArticle);
  const dirty = fields.some((key) => value[key] !== saved[key]);

  const save = async () => {
    if (value.ctaHref.trim() && !safeHref(value.ctaHref)) { setNotice("El destino del botón debe empezar por / o por https://"); return; }
    const next = { ...value, updatedAt: new Date().toISOString() };
    setSaving(true);
    try { await saveHomepageFeature(next); setValue(next); setSaved(next); setNotice(supabase ? "Destacado guardado. Ya lo ve todo el público." : "Destacado guardado en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudo guardar: ${describeError(error)}`); }
    finally { setSaving(false); }
  };
  const releaseArticle = async () => {
    if (!featureArticle || !window.confirm(`¿Quitar “${featureArticle.title}” del Feature para usar el contenido propio del Destacado?`)) return;
    try { await saveArchivePlacement(featureArticle.id, { ...{ spotlight: false, mustRead: false, latest: false, homeHero: false, homeFeature: false, homeSelection: false, order: 1 }, ...placements[featureArticle.id], homeFeature: false }); setNotice("El Feature vuelve a usar el contenido del Destacado."); }
    catch (error) { setNotice(`No se pudo quitar el artículo: ${describeError(error)}`); }
  };

  const shown = {
    eyebrow: featureArticle?.category || value.eyebrow,
    title: featureArticle?.title || value.title,
    excerpt: featureArticle?.excerpt || value.excerpt,
    author: featureArticle?.author || value.author,
    readingTime: featureArticle?.readingTime || value.readingTime,
    image: featureArticle?.image || value.image,
  };
  const textLocked = readOnly || locked;
  const ctaTarget = safeHref(value.ctaHref) || (featureArticle ? `/historias/${featureArticle.slug || featureArticle.id}` : "");

  return <section className="wysiwyg-manager">
    <header className="wysiwyg-toolbar">
      <div><p className="eyebrow">Homepage / Destacado</p><h2>Edita el bloque tal como se ve.</h2></div>
      <div className="wysiwyg-toolbar__actions">
        <div className="wysiwyg-devices" role="group" aria-label="Tamaño de la vista"><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")} aria-label="Ordenador"><Monitor size={15} /></button><button type="button" className={device === "mobile" ? "is-active" : ""} onClick={() => setDevice("mobile")} aria-label="Móvil"><Smartphone size={15} /></button></div>
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => setValue(saved)} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || !dirty}><Save size={15} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {locked ? <div className="wysiwyg-lock"><Link2 size={15} /><p>Este bloque muestra el artículo <strong>“{featureArticle!.title}”</strong>, asignado en Páginas → Destacar. Su etiqueta, título, bajada, autor e imagen vienen del artículo; aquí puedes cambiar la cita lateral y el botón.</p>{!readOnly && <button type="button" className="admin-secondary" onClick={() => void releaseArticle()}><Unlink size={14} /> Usar contenido propio</button>}</div>
      : <p className="wysiwyg-hint">Haz clic en cualquier texto para escribir encima, o en la imagen para cambiarla. Lo que ves es lo que verá el público.</p>}

    <div className={`wysiwyg-stage wysiwyg-stage--${device}`}>
      <div className="wysiwyg-canvas">
        <section className="feature-grid wysiwyg-feature">
          <div className="feature-grid__lead">
            <ImageUrlFrame className="feature-grid__image-wrap wysiwyg-feature__image" src={shown.image} onChange={(url) => update({ image: url })} emptyLabel="Haz clic para añadir la imagen" readOnly={textLocked} />
            <div className="feature-grid__lead-caption"><span>02</span><span>{shown.title}</span></div>
          </div>
          <article className="feature-grid__story">
            <span className="section-label"><span className="section-label__line" /><InlineText value={shown.eyebrow} onChange={(eyebrow) => update({ eyebrow })} placeholder="Etiqueta" readOnly={textLocked} ariaLabel="Etiqueta" /></span>
            <h2><InlineText multiline value={shown.title} onChange={(title) => update({ title })} placeholder="Título del destacado" readOnly={textLocked} ariaLabel="Título" /></h2>
            <p><InlineText multiline value={shown.excerpt} onChange={(excerpt) => update({ excerpt })} placeholder="Bajada del destacado" readOnly={textLocked} ariaLabel="Descripción" /></p>
            <div className="story-meta"><span>Por <InlineText value={shown.author} onChange={(author) => update({ author })} placeholder="Autor" readOnly={textLocked} ariaLabel="Autor" /></span><span><InlineText value={shown.readingTime} onChange={(readingTime) => update({ readingTime })} placeholder="8 min de lectura" readOnly={textLocked} ariaLabel="Tiempo de lectura" /></span></div>
            <span className="story-link wysiwyg-feature__cta"><InlineText value={value.ctaLabel} onChange={(ctaLabel) => update({ ctaLabel })} placeholder="Leer el artículo" readOnly={readOnly} ariaLabel="Texto del botón" /><ArrowUpRight size={16} strokeWidth={1.4} /></span>
            <label className="wysiwyg-feature__target"><Link2 size={12} /><input value={value.ctaHref} onChange={(event) => update({ ctaHref: event.target.value })} placeholder={featureArticle ? `/historias/${featureArticle.slug || featureArticle.id} (automático)` : "/historias/mi-articulo o https://…"} readOnly={readOnly} aria-label="Destino del botón" />{ctaTarget && <a href={ctaTarget} target="_blank" rel="noreferrer" aria-label="Probar enlace"><ArrowUpRight size={12} /></a>}</label>
          </article>
          <div className="feature-grid__aside">
            <span className="vertical-note">ESTUDIO / 2026</span>
            <p className="wysiwyg-quote"><InlineText multiline value={value.asideQuote} onChange={(asideQuote) => update({ asideQuote })} placeholder="Una cita para el margen" readOnly={readOnly} ariaLabel="Cita lateral" /></p>
          </div>
        </section>
      </div>
    </div>
    <p className="wysiwyg-footnote">{dirty ? "Tienes cambios sin guardar." : "Sin cambios pendientes."} {!readOnly && <button type="button" className="wysiwyg-link" onClick={() => { if (window.confirm("¿Volver al texto de ejemplo original?")) setValue({ ...defaultHomepageFeature, updatedAt: value.updatedAt }); }}>Restaurar ejemplo</button>}</p>
  </section>;
}
