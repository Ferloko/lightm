import { ImageOff, MousePointerClick, RotateCcw, Save, Undo2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import EditPopover from "@/components/EditPopover";
import PagePreview from "@/components/PagePreview";
import { SiteMenuPanel } from "@/components/SiteMenuOverlay";
import { safeBannerUrl } from "@/lib/pageBanners";
import { defaultSiteMenu, saveSiteMenu, useSiteMenu, type SiteMenuContent } from "@/lib/siteMenu";
import { describeError, supabase } from "@/lib/supabase";

type Picked = { field: "image" | "caption" | "note"; element: HTMLElement } | null;
const texts = { caption: { label: "Pie de la imagen", placeholder: "LIGHT / Editorial campaign" }, note: { label: "Frase bajo los enlaces", placeholder: "Historias para mirar más de cerca." } } as const;

/** Destacado → Menú lateral: el menú de tres rayas tal cual; un clic en la imagen o en un texto lo cambia ahí mismo. */
export default function SiteMenuEditor({ readOnly = false }: { readOnly?: boolean }) {
  const [remote, loading] = useSiteMenu();
  const [value, setValue] = useState<SiteMenuContent>(remote);
  const [saved, setSaved] = useState<SiteMenuContent>(remote);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [broken, setBroken] = useState(false);
  const [picked, setPicked] = useState<Picked>(null);
  useEffect(() => { setValue(remote); setSaved(remote); }, [remote]);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const update = (patch: Partial<SiteMenuContent>) => setValue((current) => ({ ...current, ...patch }));
  const image = safeBannerUrl(value.image) || defaultSiteMenu.image;
  useEffect(() => setBroken(false), [image]);
  const closePicked = useCallback(() => setPicked(null), []);
  const customImage = value.image && value.image !== defaultSiteMenu.image ? value.image : "";

  const save = async () => {
    if (value.image.trim() && !safeBannerUrl(value.image)) { setNotice("La URL de la imagen debe empezar por https:// o ser una ruta /images/…"); return; }
    setSaving(true); setNotice(""); setPicked(null);
    try { await saveSiteMenu(value); setSaved(value); setNotice(supabase ? "Menú guardado. Ya lo ve todo el público." : "Menú guardado en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudo guardar: ${describeError(error)}`); }
    finally { setSaving(false); }
  };

  return <section className="wysiwyg-manager">
    <header className="wysiwyg-toolbar">
      <div><p className="eyebrow">Portada y hojas / Menú lateral</p><h2>La imagen del menú.</h2></div>
      <div className="wysiwyg-toolbar__actions">
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => { setValue(saved); setPicked(null); }} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || loading || !dirty}><Save size={15} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="banners-live__hint"><MousePointerClick size={14} /><p>Es el menú que se abre con las tres rayas en la portada y en todas las hojas públicas. {readOnly ? "" : "Haz clic en la imagen, en su pie o en la frase para cambiarlos."}</p>{!readOnly && JSON.stringify({ ...value, image: customImage }) !== JSON.stringify({ ...defaultSiteMenu, image: "" }) && <button type="button" className="wysiwyg-link" onClick={() => setValue({ ...defaultSiteMenu, image: "" })}><Undo2 size={12} /> Volver al original</button>}</div>
    <PagePreview label="Menú lateral" onPick={readOnly ? undefined : (field, element) => setPicked({ field: field as NonNullable<Picked>["field"], element })} active={picked?.field}><SiteMenuPanel menu={{ ...value, image }} onClose={() => undefined} isCurrent={(href) => href === "/"} preview /></PagePreview>

    {picked?.field === "image" && <EditPopover anchor={picked.element} title="Imagen del menú" onClose={closePicked}>
      <div className="edit-popover__image">{broken ? <span><ImageOff size={18} /></span> : <img src={image} alt="" style={{ objectPosition: `center ${value.focus}%` }} onError={() => setBroken(true)} />}</div>
      <label>URL de la imagen<input autoFocus value={customImage} onChange={(event) => update({ image: event.target.value })} placeholder="Vacío = la imagen original" /></label>
      {broken && <small className="edit-popover__error">No se pudo cargar la imagen.</small>}
      <label>Encuadre ({value.focus}%)<input type="range" min={0} max={100} value={value.focus} onChange={(event) => update({ focus: Number(event.target.value) })} /></label>
      <small>Mejor una foto vertical (3:4).</small>
      <footer>{customImage || value.focus !== 50 ? <button type="button" className="wysiwyg-link" onClick={() => update({ image: "", focus: 50 })}><Undo2 size={12} /> Original</button> : <span />}<button type="button" className="admin-primary" onClick={closePicked}>Listo</button></footer>
    </EditPopover>}
    {picked && picked.field !== "image" && <EditPopover anchor={picked.element} title={texts[picked.field].label} onClose={closePicked}>
      <input autoFocus value={value[picked.field]} onChange={(event) => update({ [picked.field]: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") closePicked(); }} placeholder={texts[picked.field].placeholder} />
      <small>Vacío = no se muestra.</small>
      <footer>{value[picked.field] !== defaultSiteMenu[picked.field] ? <button type="button" className="wysiwyg-link" onClick={() => update({ [picked.field]: defaultSiteMenu[picked.field] })}><Undo2 size={12} /> Original</button> : <span />}<button type="button" className="admin-primary" onClick={closePicked}>Listo</button></footer>
    </EditPopover>}
  </section>;
}
