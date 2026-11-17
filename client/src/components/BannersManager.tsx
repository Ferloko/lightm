import { ArrowUpRight, ImageOff, MousePointerClick, RotateCcw, Save, Undo2 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType } from "react";
import EditPopover from "@/components/EditPopover";
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
type Picked = { field: "image" | keyof BannerTexts; element: HTMLElement } | null;

/**
 * Dashboard → Banners: la hoja real con los cambios sin guardar. Un clic sobre la imagen o sobre un
 * texto de la cabecera abre un recuadro para cambiarlo ahí mismo.
 */
export default function BannersManager({ readOnly = false }: { readOnly?: boolean }) {
  const [overrides, setOverrides] = useState<PageBannerOverrides>({});
  const [saved, setSaved] = useState<PageBannerOverrides>({});
  const [selected, setSelected] = useState<BannerKey>("moda");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [broken, setBroken] = useState(false);
  const [picked, setPicked] = useState<Picked>(null);

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
  const pageDirty = (key: BannerKey) => JSON.stringify(overrides[key]) !== JSON.stringify(saved[key]);
  useEffect(() => setBroken(false), [current.image]);
  const closePicked = useCallback(() => setPicked(null), []);

  const update = (patch: Partial<BannerOverride>) => setOverrides((value) => ({ ...value, [selected]: { image: value[selected]?.image ?? "", focus: value[selected]?.focus ?? page.focus, ...value[selected], ...patch } }));
  // Si el texto vuelve a ser el original, deja de ser un cambio.
  const setText = (key: keyof BannerTexts, value: string) => update({ [key]: value.trim() === page.texts[key].trim() ? undefined : value });
  const restorePage = () => setOverrides((value) => { const next = { ...value }; delete next[selected]; return next; });
  const choose = (key: BannerKey) => { setSelected(key); setPicked(null); setNotice(""); };
  const save = async () => {
    const invalid = bannerPages.filter((item) => overrides[item.key]?.image && !safeBannerUrl(overrides[item.key]!.image));
    if (invalid.length) { choose(invalid[0].key); setNotice(`La URL del banner de ${invalid[0].label} no es válida: usa una dirección https:// o una ruta /images/…`); return; }
    // Lo que vuelve a su estado original no se guarda.
    const cleaned = Object.fromEntries(Object.entries(overrides).filter(([key, value]) => isChanged(value, bannerPages.find((item) => item.key === key)!.focus))) as PageBannerOverrides;
    setSaving(true); setNotice(""); setPicked(null);
    try { const merged = await savePageBannerChanges(saved, cleaned); setOverrides(merged); setSaved(merged); setNotice(supabase ? "Banners guardados. Ya los ve todo el público." : "Banners guardados en este navegador de demostración."); }
    catch (error) { setNotice(`No se pudieron guardar los banners: ${describeError(error)}`); }
    finally { setSaving(false); }
  };
  const Preview = previewPages[selected];
  const textField = picked && picked.field !== "image" ? textFields.find((field) => field.key === picked.field)! : null;

  return <section className="wysiwyg-manager banners-manager">
    <header className="wysiwyg-toolbar">
      <div><p className="eyebrow">LIGHT / Hojas públicas</p><h2>Banners.</h2></div>
      <div className="wysiwyg-toolbar__actions">
        <a className="admin-secondary" href={page.path} target="_blank" rel="noreferrer"><ArrowUpRight size={13} /> Ver hoja</a>
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => { setOverrides(saved); setPicked(null); }} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || loading || !dirty}><Save size={15} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}

    <nav className="wysiwyg-blocks banners-pages" aria-label="Hojas" aria-busy={loading}>
      {bannerPages.map((item) => {
        const banner = bannerFor(item.key, overrides);
        const status = pageDirty(item.key) ? "Sin guardar" : isChanged(overrides[item.key], item.focus) ? "Personalizado" : item.path;
        return <button type="button" key={item.key} className={`${selected === item.key ? "is-active" : ""}${pageDirty(item.key) ? " is-dirty" : ""}`} onClick={() => choose(item.key)} aria-pressed={selected === item.key}>
          <img src={banner.image} alt="" style={{ objectPosition: banner.position }} loading="lazy" />
          <span><strong>{item.label}</strong><small>{status}</small></span>
        </button>;
      })}
    </nav>

    <div className="banners-live__hint"><MousePointerClick size={14} /><p>{readOnly ? "Solo lectura: así se ve la cabecera de cada hoja." : "Haz clic en la imagen o en un texto de la cabecera para cambiarlo ahí mismo."}</p>{!readOnly && override && <button type="button" className="wysiwyg-link" onClick={restorePage}><Undo2 size={12} /> Volver al original de {page.label}</button>}</div>

    <BannerDraftContext.Provider value={overrides}>
      <PagePreview key={selected} label={`${page.label} · ${page.path}`} onPick={readOnly ? undefined : (field, element) => setPicked({ field: field as NonNullable<Picked>["field"], element })} active={picked?.field}>
        <Suspense fallback={<p className="page-preview__loading">Cargando la hoja…</p>}><Preview /></Suspense>
      </PagePreview>
    </BannerDraftContext.Provider>

    {picked?.field === "image" && <EditPopover anchor={picked.element} title="Imagen de la cabecera" onClose={closePicked}>
      <div className="edit-popover__image">{broken ? <span><ImageOff size={18} /></span> : <img src={current.image} alt="" style={{ objectPosition: current.position }} onError={() => setBroken(true)} />}</div>
      <label>URL de la imagen<input autoFocus value={override?.image ?? ""} onChange={(event) => update({ image: event.target.value })} placeholder="Vacío = la imagen original" /></label>
      {broken && <small className="edit-popover__error">No se pudo cargar la imagen.</small>}
      <label>Encuadre · {focus <= 20 ? "arriba" : focus >= 80 ? "abajo" : "centro"} ({focus}%)<input type="range" min={0} max={100} value={focus} onChange={(event) => update({ focus: Number(event.target.value) })} /></label>
      <footer>{(override?.image || focus !== page.focus) ? <button type="button" className="wysiwyg-link" onClick={() => update({ image: "", focus: page.focus })}><Undo2 size={12} /> Original</button> : <span />}<button type="button" className="admin-primary" onClick={closePicked}>Listo</button></footer>
    </EditPopover>}
    {textField && picked && <EditPopover anchor={picked.element} title={textField.label} onClose={closePicked}>
      {textField.multiline
        ? <textarea autoFocus rows={textField.key === "dek" ? 4 : 3} value={override?.[textField.key] ?? page.texts[textField.key]} onChange={(event) => setText(textField.key, event.target.value)} placeholder={page.texts[textField.key] || "Automático"} />
        : <input autoFocus value={override?.[textField.key] ?? page.texts[textField.key]} onChange={(event) => setText(textField.key, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") closePicked(); }} placeholder={page.texts[textField.key] || "Automático"} />}
      <small>{textField.help ? `${textField.help} ` : ""}{page.texts[textField.key] ? "Vacío = el texto original." : "Vacío = se escribe solo con el contenido de la hoja."}</small>
      <footer>{override?.[textField.key] ? <button type="button" className="wysiwyg-link" onClick={() => update({ [textField.key]: undefined })}><Undo2 size={12} /> Original</button> : <span />}<button type="button" className="admin-primary" onClick={closePicked}>Listo</button></footer>
    </EditPopover>}
  </section>;
}
