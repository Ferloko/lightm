import { ArrowUpRight, ImageOff, RotateCcw, Save, Undo2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from "react";
import PagePreview from "@/components/PagePreview";
import { BannerDraftContext, bannerFor, bannerPages, bannerTextKeys, fetchPageBanners, safeBannerUrl, savePageBannerChanges, type BannerKey, type BannerOverride, type BannerTexts, type PageBannerOverrides } from "@/lib/pageBanners";
import { describeError, supabase } from "@/lib/supabase";

/* Las hojas reales, para la vista previa (se cargan solo al abrirlas). */
const SectionPage = lazy(() => import("@/pages/SectionPage"));
const InfoPage = lazy(() => import("@/pages/InfoPage"));
const previewPages: Record<BannerKey, ComponentType> = {
  moda: () => <SectionPage section="moda" />,
  belleza: () => <SectionPage section="belleza" />,
  eventos: () => <SectionPage section="eventos" />,
  living: lazy(() => import("@/pages/LivingPage")),
  runway: lazy(() => import("@/pages/RunwayPage")),
  archivo: lazy(() => import("@/pages/ArchivePage")),
  "sobre-moda": () => <InfoPage kind="sobre-moda" />,
  masthead: lazy(() => import("@/pages/MastheadPage")),
  about: lazy(() => import("@/pages/AboutPage")),
  business: lazy(() => import("@/pages/BusinessPage")),
  privacidad: () => <InfoPage kind="privacidad" />,
  terminos: () => <InfoPage kind="terminos" />,
  cookies: () => <InfoPage kind="cookies" />,
  "not-found": lazy(() => import("@/pages/NotFound")),
};

const textFields: { key: keyof BannerTexts; label: string; multiline?: boolean; help?: string }[] = [
  { key: "kicker", label: "Antetítulo" },
  { key: "title", label: "Título", multiline: true, help: "Enter = salto de línea · *entre asteriscos* = cursiva." },
  { key: "dek", label: "Bajada", multiline: true },
];
const isChanged = (override: BannerOverride | undefined, focus: number) => Boolean(override && (safeBannerUrl(override.image) || override.focus !== focus || bannerTextKeys.some((key) => override[key]?.trim())));

/** Dashboard → Banners: la cabecera de cada hoja pública (imagen, encuadre y textos), con la hoja real en vivo. */
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
  const groups = useMemo(() => [...new Set(bannerPages.map((item) => item.group))], []);
  const pageDirty = (key: BannerKey) => JSON.stringify(overrides[key]) !== JSON.stringify(saved[key]);
  useEffect(() => setBroken(false), [current.image]);

  const update = (patch: Partial<BannerOverride>) => setOverrides((value) => ({ ...value, [selected]: { image: value[selected]?.image ?? "", focus: value[selected]?.focus ?? page.focus, ...value[selected], ...patch } }));
  const restoreImage = () => update({ image: "", focus: page.focus });
  const restoreTexts = () => update({ kicker: undefined, title: undefined, dek: undefined });
  const save = async () => {
    const invalid = bannerPages.filter((item) => overrides[item.key]?.image && !safeBannerUrl(overrides[item.key]!.image));
    if (invalid.length) { setSelected(invalid[0].key); setNotice(`La URL del banner de ${invalid[0].label} no es válida: usa una dirección https:// o una ruta /images/…`); return; }
    // Lo que vuelve a su estado original no se guarda.
    const cleaned = Object.fromEntries(Object.entries(overrides).filter(([key, value]) => isChanged(value, bannerPages.find((item) => item.key === key)!.focus))) as PageBannerOverrides;
    setSaving(true); setNotice("");
    try { const merged = await savePageBannerChanges(saved, cleaned); setOverrides(merged); setSaved(merged); setNotice(supabase ? "Banners guardados. Ya los ve todo el público." : "Banners guardados en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudieron guardar los banners: ${describeError(error)}`); }
    finally { setSaving(false); }
  };
  const Preview = previewPages[selected];
  const hasTexts = bannerTextKeys.some((key) => override?.[key]?.trim());
  const hasImage = Boolean(override && (override.image.trim() || override.focus !== page.focus));

  return <section className="wysiwyg-manager banners-manager">
    <header className="wysiwyg-toolbar">
      <div><p className="eyebrow">LIGHT / Hojas públicas</p><h2>Banners.</h2></div>
      <div className="wysiwyg-toolbar__actions">
        <a className="admin-secondary" href={page.path} target="_blank" rel="noreferrer"><ArrowUpRight size={13} /> Ver hoja</a>
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => setOverrides(saved)} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || loading || !dirty}><Save size={15} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <p className="wysiwyg-hint">Elige una hoja y cambia la imagen, el encuadre y los textos de su cabecera. A la derecha ves la hoja real con tus cambios antes de guardar. Las ediciones de la revista tienen su banner en Ediciones.</p>

    <nav className="banners-strip" aria-label="Hojas" aria-busy={loading}>
      {groups.map((group) => <div className="banners-strip__group" key={group}><p className="eyebrow">{group}</p><div>
        {bannerPages.filter((item) => item.group === group).map((item) => {
          const banner = bannerFor(item.key, overrides);
          return <button type="button" key={item.key} className={`banners-strip__item${selected === item.key ? " is-selected" : ""}`} onClick={() => { setSelected(item.key); setNotice(""); }} aria-pressed={selected === item.key}>
            <span><img src={banner.image} alt="" style={{ objectPosition: banner.position }} loading="lazy" /></span>
            <strong>{item.label}</strong>
            <small>{pageDirty(item.key) ? "Sin guardar" : isChanged(overrides[item.key], item.focus) ? "Personalizado" : "Original"}</small>
          </button>;
        })}
      </div></div>)}
    </nav>

    <div className="banners-editor">
      <fieldset className="runway-sheet banners-editor__form" disabled={readOnly || loading}>
        <header className="banners-editor__head"><p className="eyebrow">Banner</p><h3>{page.label}</h3><small>{page.path}</small></header>
        <section>
          <h3><span>01</span> Imagen</h3>
          <div className="runway-sheet__image"><div className="runway-sheet__thumb banners-editor__thumb">{broken ? <ImageOff size={20} /> : <img src={current.image} alt="" style={{ objectPosition: current.position }} onError={() => setBroken(true)} />}</div>
            <label>URL de la imagen<input value={override?.image ?? ""} onChange={(event) => update({ image: event.target.value })} placeholder={`Original: ${page.image.length > 40 ? `${page.image.slice(0, 40)}…` : page.image}`} /><small>{broken ? "No se pudo cargar la imagen." : "https:// o una ruta /images/… · vacío = la original."}</small></label></div>
          <label>Encuadre vertical · {focus <= 20 ? "parte superior" : focus >= 80 ? "parte inferior" : "centro"} ({focus}%)<input className="banners-editor__range" type="range" min={0} max={100} value={focus} onChange={(event) => update({ focus: Number(event.target.value) })} /><small className="banners-manager__range"><span>Arriba</span><span>Abajo</span></small></label>
          {hasImage && <button type="button" className="admin-secondary banners-editor__restore" onClick={restoreImage}><Undo2 size={13} /> Imagen original</button>}
        </section>
        <section>
          <h3><span>02</span> Texto</h3>
          {textFields.map((field) => {
            const original = page.texts[field.key];
            const value = override?.[field.key] ?? "";
            const placeholder = original ? original.replace(/\n/g, " ⏎ ") : "Automático";
            return <label key={field.key}>{field.label}{field.multiline ? <textarea rows={field.key === "dek" ? 3 : 2} value={value} onChange={(event) => update({ [field.key]: event.target.value })} placeholder={placeholder} /> : <input value={value} onChange={(event) => update({ [field.key]: event.target.value })} placeholder={placeholder} />}<small>{field.help ? `${field.help} ` : ""}{original ? "Vacío = el texto original." : "Vacío = se escribe solo, con el contenido de la hoja."}</small></label>;
          })}
          {hasTexts && <button type="button" className="admin-secondary banners-editor__restore" onClick={restoreTexts}><Undo2 size={13} /> Textos originales</button>}
        </section>
      </fieldset>
      <aside className="runway-studio__preview banners-editor__preview">
        <BannerDraftContext.Provider value={overrides}>
          <PagePreview key={selected}>
            <Suspense fallback={<p className="page-preview__loading">Cargando la hoja…</p>}><Preview /></Suspense>
          </PagePreview>
        </BannerDraftContext.Provider>
      </aside>
    </div>
  </section>;
}
