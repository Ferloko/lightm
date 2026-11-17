import { ImageOff, RotateCcw, Save, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import PagePreview from "@/components/PagePreview";
import { SiteMenuPanel } from "@/components/SiteMenuOverlay";
import { safeBannerUrl } from "@/lib/pageBanners";
import { defaultSiteMenu, saveSiteMenu, useSiteMenu, type SiteMenuContent } from "@/lib/siteMenu";
import { describeError, supabase } from "@/lib/supabase";

/** Destacado → Menú lateral: la imagen y los textos del menú de tres rayas (portada y hojas públicas). */
export default function SiteMenuEditor({ readOnly = false }: { readOnly?: boolean }) {
  const [remote, loading] = useSiteMenu();
  const [value, setValue] = useState<SiteMenuContent>(remote);
  const [saved, setSaved] = useState<SiteMenuContent>(remote);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [broken, setBroken] = useState(false);
  useEffect(() => { setValue(remote); setSaved(remote); }, [remote]);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const update = (patch: Partial<SiteMenuContent>) => setValue((current) => ({ ...current, ...patch }));
  const image = safeBannerUrl(value.image) || defaultSiteMenu.image;
  useEffect(() => setBroken(false), [image]);

  const save = async () => {
    if (value.image.trim() && !safeBannerUrl(value.image)) { setNotice("La URL de la imagen debe empezar por https:// o ser una ruta /images/…"); return; }
    setSaving(true); setNotice("");
    try { await saveSiteMenu(value); setSaved(value); setNotice(supabase ? "Menú guardado. Ya lo ve todo el público." : "Menú guardado en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudo guardar: ${describeError(error)}`); }
    finally { setSaving(false); }
  };

  return <section className="wysiwyg-manager">
    <header className="wysiwyg-toolbar">
      <div><p className="eyebrow">Portada y hojas / Menú lateral</p><h2>La imagen del menú.</h2></div>
      <div className="wysiwyg-toolbar__actions">
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => setValue(saved)} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || loading || !dirty}><Save size={15} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <p className="wysiwyg-hint">Es el menú que se abre con las tres rayas (“Menú”) en la portada y en todas las hojas públicas. A la derecha lo ves tal como se abrirá.</p>
    <div className="banners-editor">
      <fieldset className="runway-sheet" disabled={readOnly || loading}>
        <section>
          <h3><span>01</span> Imagen</h3>
          <div className="runway-sheet__image"><div className="runway-sheet__thumb">{broken ? <ImageOff size={20} /> : <img src={image} alt="" style={{ objectPosition: `center ${value.focus}%` }} onError={() => setBroken(true)} />}</div>
            <label>URL de la imagen<input value={value.image === defaultSiteMenu.image ? "" : value.image} onChange={(event) => update({ image: event.target.value })} placeholder={`Original: ${defaultSiteMenu.image}`} /><small>{broken ? "No se pudo cargar la imagen." : "Vertical (3:4) · https:// o una ruta /images/… · vacío = la original."}</small></label></div>
          <label>Encuadre vertical ({value.focus}%)<input className="banners-editor__range" type="range" min={0} max={100} value={value.focus} onChange={(event) => update({ focus: Number(event.target.value) })} /><small className="banners-manager__range"><span>Arriba</span><span>Abajo</span></small></label>
        </section>
        <section>
          <h3><span>02</span> Texto</h3>
          <label>Pie de la imagen<input value={value.caption} onChange={(event) => update({ caption: event.target.value })} placeholder="LIGHT / Editorial campaign" /><small>Vacío = sin pie.</small></label>
          <label>Frase bajo los enlaces<input value={value.note} onChange={(event) => update({ note: event.target.value })} placeholder="Historias para mirar más de cerca." /><small>Vacío = sin frase.</small></label>
          {JSON.stringify(value) !== JSON.stringify(defaultSiteMenu) && <button type="button" className="admin-secondary banners-editor__restore" onClick={() => setValue({ ...defaultSiteMenu, image: "" })}><Undo2 size={13} /> Volver al original</button>}
        </section>
      </fieldset>
      <aside className="runway-studio__preview banners-editor__preview"><PagePreview><SiteMenuPanel menu={{ ...value, image }} onClose={() => undefined} isCurrent={(href) => href === "/"} preview /></PagePreview></aside>
    </div>
  </section>;
}
