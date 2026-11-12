import { ArrowUpRight, ImageOff, RotateCcw, Save, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { bannerFor, bannerPages, fetchPageBanners, savePageBanners, type BannerKey, type PageBannerOverrides } from "@/lib/pageBanners";
import { describeError, supabase } from "@/lib/supabase";
import { safeImageUrl } from "@/lib/utils";

/** Dashboard → Banners: la imagen del hero de cada hoja pública, con su encuadre. */
export default function BannersManager({ readOnly = false }: { readOnly?: boolean }) {
  const [overrides, setOverrides] = useState<PageBannerOverrides>({});
  const [saved, setSaved] = useState<PageBannerOverrides>({});
  const [selected, setSelected] = useState<BannerKey>("moda");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchPageBanners().then((value) => { if (active) { setOverrides(value); setSaved(value); } }).catch((error) => { if (active) setNotice(`No se pudieron leer los banners: ${describeError(error)}`); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const dirty = JSON.stringify(overrides) !== JSON.stringify(saved);
  const page = bannerPages.find((item) => item.key === selected)!;
  const current = bannerFor(selected, overrides);
  const override = overrides[selected];
  const focus = override ? override.focus : page.focus;
  const draftUrl = override?.image ?? "";
  const groups = useMemo(() => [...new Set(bannerPages.map((item) => item.group))], []);
  useEffect(() => setBroken(false), [current.image]);

  const update = (patch: Partial<{ image: string; focus: number }>) => setOverrides((value) => ({ ...value, [selected]: { image: value[selected]?.image ?? "", focus: value[selected]?.focus ?? page.focus, ...patch } }));
  const restore = () => setOverrides((value) => { const next = { ...value }; delete next[selected]; return next; });
  const save = async () => {
    const invalid = bannerPages.filter((item) => overrides[item.key]?.image && !safeImageUrl(overrides[item.key]!.image));
    if (invalid.length) { setSelected(invalid[0].key); setNotice(`La URL del banner de ${invalid[0].label} no es válida: usa una dirección https:// o una ruta /images/…`); return; }
    setSaving(true); setNotice("");
    try { await savePageBanners(overrides); setSaved(overrides); setNotice(supabase ? "Banners guardados. Ya los ve todo el público." : "Banners guardados en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudieron guardar los banners: ${describeError(error)}`); }
    finally { setSaving(false); }
  };

  return <section className="wysiwyg-manager banners-manager">
    <header className="wysiwyg-toolbar">
      <div><p className="eyebrow">LIGHT / Hojas públicas</p><h2>Banners.</h2></div>
      <div className="wysiwyg-toolbar__actions">
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => setOverrides(saved)} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || loading || !dirty}><Save size={15} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <p className="wysiwyg-hint">Elige una hoja para cambiar la imagen de su cabecera y su encuadre. Las ediciones de la revista tienen su banner en Ediciones.</p>

    <div className="banners-manager__layout" aria-busy={loading}>
      <div className="banners-manager__list">
        {groups.map((group) => <section key={group}><p className="eyebrow">{group}</p><div className="banners-manager__grid">
          {bannerPages.filter((item) => item.group === group).map((item) => {
            const banner = bannerFor(item.key, overrides);
            return <button type="button" key={item.key} className={`banner-card${selected === item.key ? " is-selected" : ""}`} onClick={() => { setSelected(item.key); setNotice(""); }} aria-pressed={selected === item.key}>
              <span className="banner-card__image"><img src={banner.image} alt="" style={{ objectPosition: banner.position }} loading="lazy" /></span>
              <span className="banner-card__meta"><strong>{item.label}</strong><small>{item.path}</small></span>
              <em className={banner.custom ? "is-custom" : ""}>{banner.custom ? "Personalizado" : "Original"}</em>
            </button>;
          })}
        </div></section>)}
      </div>

      <aside className="banners-manager__panel" aria-label={`Banner de ${page.label}`}>
        <div className="banners-manager__panel-head"><div><p className="eyebrow">Banner</p><h3>{page.label}</h3></div><a href={page.path} target="_blank" rel="noreferrer">Ver hoja <ArrowUpRight size={12} /></a></div>
        <div className="banners-manager__previews">
          <figure className="banners-manager__preview banners-manager__preview--desktop">{broken ? <span className="banners-manager__broken"><ImageOff size={20} />No se pudo cargar la imagen</span> : <img src={current.image} alt="" style={{ objectPosition: current.position }} onError={() => setBroken(true)} />}<i style={{ top: `${focus}%` }} /><figcaption>Ordenador</figcaption></figure>
          <figure className="banners-manager__preview banners-manager__preview--mobile">{!broken && <img src={current.image} alt="" style={{ objectPosition: current.position }} />}<i style={{ top: `${focus}%` }} /><figcaption>Móvil</figcaption></figure>
        </div>
        <fieldset className="admin-fieldset banners-manager__fields" disabled={readOnly}>
          <label>Imagen<input value={draftUrl} onChange={(event) => update({ image: event.target.value })} placeholder={`Original: ${page.image.length > 48 ? `${page.image.slice(0, 48)}…` : page.image}`} /></label>
          <label>Encuadre vertical <span>{focus <= 20 ? "Parte superior" : focus >= 80 ? "Parte inferior" : "Centro"} · {focus}%</span><input type="range" min={0} max={100} value={focus} onChange={(event) => update({ focus: Number(event.target.value) })} /><small className="banners-manager__range"><span>Arriba</span><span>Abajo</span></small></label>
          {(override || current.custom) && <button type="button" className="admin-secondary" onClick={restore}><Undo2 size={13} /> Restaurar original</button>}
        </fieldset>
        <p className="banners-manager__note">La línea marca el punto de la foto que siempre queda a la vista: en pantallas estrechas se recortan los lados y arriba/abajo según este encuadre.</p>
      </aside>
    </div>
  </section>;
}
