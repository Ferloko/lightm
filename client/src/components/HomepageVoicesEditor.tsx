import { ArrowUpRight, Link2, Monitor, RotateCcw, Save, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { describeError, supabase } from "@/lib/supabase";
import { defaultHomepageVoices, fetchHomepageVoices, getHomepageVoices, homepageVoicesFields, saveHomepageVoices, type HomepageVoicesContent } from "@/lib/homepageVoices";
import { safeHref } from "@/lib/utils";
import { ImageUrlFrame, InlineText } from "@/components/InlineEditing";

type Device = "desktop" | "mobile";

/**
 * “Cartas de estilo” (section.voices-section de la portada) editado sobre su propio diseño:
 * mismas clases que en la portada, y cada texto o imagen se cambia en su sitio.
 */
export default function HomepageVoicesEditor({ readOnly = false }: { readOnly?: boolean }) {
  const [value, setValue] = useState<HomepageVoicesContent>(() => getHomepageVoices());
  const [saved, setSaved] = useState<HomepageVoicesContent>(() => getHomepageVoices());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const update = (patch: Partial<HomepageVoicesContent>) => setValue((current) => ({ ...current, ...patch }));

  useEffect(() => {
    let active = true;
    void fetchHomepageVoices().then((remote) => { if (active) { setValue(remote); setSaved(remote); } }).catch((error) => setNotice(`No se pudo cargar: ${describeError(error)}`));
    return () => { active = false; };
  }, []);

  const dirty = homepageVoicesFields.some((key) => value[key] !== saved[key]);
  const ctaTarget = safeHref(value.ctaHref);
  const save = async () => {
    if (value.ctaHref.trim() && !ctaTarget) { setNotice("El destino del botón debe empezar por / o por https://"); return; }
    const next = { ...value, updatedAt: new Date().toISOString() };
    setSaving(true);
    try { await saveHomepageVoices(next); setValue(next); setSaved(next); setNotice(supabase ? "Cartas de estilo guardado. Ya lo ve todo el público." : "Cartas de estilo guardado en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudo guardar: ${describeError(error)}`); }
    finally { setSaving(false); }
  };

  return <section className="wysiwyg-manager">
    <header className="wysiwyg-toolbar">
      <div><p className="eyebrow">Homepage / Cartas de estilo</p><h2>Edita el bloque tal como se ve.</h2></div>
      <div className="wysiwyg-toolbar__actions">
        <div className="wysiwyg-devices" role="group" aria-label="Tamaño de la vista"><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")} aria-label="Ordenador"><Monitor size={15} /></button><button type="button" className={device === "mobile" ? "is-active" : ""} onClick={() => setDevice("mobile")} aria-label="Móvil"><Smartphone size={15} /></button></div>
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => setValue(saved)} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || !dirty}><Save size={15} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <p className="wysiwyg-hint">Es el bloque con la foto en blanco y negro y la cita, más abajo en la portada. Haz clic en cualquier texto para escribir encima, o en la imagen para cambiarla. Deja la cita vacía para ocultar el recuadro.</p>

    <div className={`wysiwyg-stage wysiwyg-stage--${device}`}>
      <div className="wysiwyg-canvas">
        <section className="voices-section wysiwyg-voices">
          <div className="voices-section__heading">
            <span className="section-label"><span className="section-label__line" /><InlineText value={value.label} onChange={(label) => update({ label })} placeholder="Etiqueta" readOnly={readOnly} ariaLabel="Etiqueta" /></span>
            <h2><InlineText multiline value={value.title} onChange={(title) => update({ title })} placeholder="Título" readOnly={readOnly} ariaLabel="Título" /><em><InlineText multiline value={value.titleEmphasis} onChange={(titleEmphasis) => update({ titleEmphasis })} placeholder="en cursiva" readOnly={readOnly} ariaLabel="Título en cursiva" /></em></h2>
          </div>
          <div className="voices-section__main">
            <ImageUrlFrame className="wysiwyg-voices__image" src={value.image} onChange={(image) => update({ image })} emptyLabel="Haz clic para añadir la imagen" readOnly={readOnly} />
            <div className="voices-section__quote"><span>“</span><p><InlineText multiline value={value.quote} onChange={(quote) => update({ quote })} placeholder="Una cita (vacía = sin recuadro)" readOnly={readOnly} ariaLabel="Cita" /></p><small>— <InlineText value={value.quoteAuthor} onChange={(quoteAuthor) => update({ quoteAuthor })} placeholder="Autor, cargo" readOnly={readOnly} ariaLabel="Autor de la cita" /></small></div>
          </div>
          <div className="voices-section__side">
            <p className="eyebrow"><InlineText value={value.sideEyebrow} onChange={(sideEyebrow) => update({ sideEyebrow })} placeholder="Antetítulo" readOnly={readOnly} ariaLabel="Antetítulo lateral" /></p>
            <h3><InlineText multiline value={value.sideTitle} onChange={(sideTitle) => update({ sideTitle })} placeholder="Titular lateral" readOnly={readOnly} ariaLabel="Titular lateral" /></h3>
            <p><InlineText multiline value={value.sideText} onChange={(sideText) => update({ sideText })} placeholder="Texto lateral" readOnly={readOnly} ariaLabel="Texto lateral" /></p>
            <span className="story-link wysiwyg-feature__cta"><InlineText value={value.ctaLabel} onChange={(ctaLabel) => update({ ctaLabel })} placeholder="Texto del botón (vacío = sin botón)" readOnly={readOnly} ariaLabel="Texto del botón" /><ArrowUpRight size={16} strokeWidth={1.4} /></span>
            <label className="wysiwyg-feature__target"><Link2 size={12} /><input value={value.ctaHref} onChange={(event) => update({ ctaHref: event.target.value })} placeholder="/sobre-moda o https://…" readOnly={readOnly} aria-label="Destino del botón" />{ctaTarget && <a href={ctaTarget} target="_blank" rel="noreferrer" aria-label="Probar enlace"><ArrowUpRight size={12} /></a>}</label>
          </div>
        </section>
      </div>
    </div>
    <p className="wysiwyg-footnote">{dirty ? "Tienes cambios sin guardar." : "Sin cambios pendientes."} {!readOnly && <button type="button" className="wysiwyg-link" onClick={() => { if (window.confirm("¿Volver al texto de ejemplo original?")) setValue({ ...defaultHomepageVoices, updatedAt: value.updatedAt }); }}>Restaurar ejemplo</button>}</p>
  </section>;
}
