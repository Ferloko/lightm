import { useEffect, useState } from "react";
import { Check, Save, X } from "lucide-react";
import { fetchArchivePlacements, getArchivePlacements, saveArchivePlacement, type ArchivePlacement } from "@/lib/archivePlacements";
import { describeError } from "@/lib/supabase";
import type { EditorialArticle } from "@/lib/editorial";

type PlacementKey = keyof Omit<ArchivePlacement, "order">;
type Slot = { key: PlacementKey; group: "Homepage" | "Archivo"; label: string; description: string; usesOrder?: boolean };

const emptyPlacement: ArchivePlacement = { spotlight: false, mustRead: false, latest: false, homeHero: false, homeFeature: false, homeSelection: false, order: 1 };
const slots: Slot[] = [
  { key: "homeHero", group: "Homepage", label: "Hero", description: "La portada principal: una sola historia, a pantalla completa." },
  { key: "homeFeature", group: "Homepage", label: "Feature", description: "El bloque editorial principal, imagen y texto en paralelo." },
  { key: "homeSelection", group: "Homepage", label: "Selección", description: "La cuadrícula de historias del inicio.", usesOrder: true },
  { key: "spotlight", group: "Archivo", label: "Spotlight", description: "El destacado que abre el Archivo." },
  { key: "mustRead", group: "Archivo", label: "Must-Reads", description: "La lista de lecturas imprescindibles.", usesOrder: true },
  { key: "latest", group: "Archivo", label: "Latest issue", description: "La cuadrícula de historias recientes." },
];

/** Tiny page schematic: where the slot sits on its page. */
function SlotDiagram({ slot }: { slot: PlacementKey }) {
  return <span className={`placement-diagram placement-diagram--${slot}`} aria-hidden="true"><i /><i /><i /><i /></span>;
}

/** Neighbouring story in a preview: a muted placeholder so the current one stands out. */
function Ghost({ className = "" }: { className?: string }) {
  return <div className={`slot-mini__ghost ${className}`}><div className="slot-mini__img" /><i /><i /></div>;
}

/**
 * Miniature of the real slot, built with the same composition the public page uses
 * (Home: hero, feature-grid, story-grid; Archivo: spotlight, must-reads, latest grid).
 */
function SlotPreview({ slot, article }: { slot: Slot; article: EditorialArticle }) {
  const img = article.image ? <img src={article.image} alt="" /> : <span className="slot-mini__noimg">LIGHT</span>;
  const title = article.title || "Sin título";
  const category = article.category || "Historia";
  const excerpt = article.excerpt || "La bajada de la historia aparece aquí.";
  const author = article.author || "LIGHT";
  const date = article.date || "";
  const body = {
    homeHero: <div className="slot-mini slot-mini--hero"><div className="slot-mini__copy"><p className="slot-mini__kicker"><i />{category} / Homepage</p><h4 className="slot-mini__display">{title}</h4><p className="slot-mini__dek">{excerpt}</p><span className="slot-mini__link">Descubrir la portada ↗</span></div><div className="slot-mini__frame"><div className="slot-mini__img">{img}</div><div className="slot-mini__caption"><span>01 — 01</span><span>{author}</span></div></div></div>,
    homeFeature: <div className="slot-mini slot-mini--feature"><div><div className="slot-mini__img">{img}</div><div className="slot-mini__caption"><span>02</span><span>{title}</span></div></div><div className="slot-mini__copy"><p className="slot-mini__kicker"><i />{category}</p><h4 className="slot-mini__display">{title}</h4><p className="slot-mini__dek">{excerpt}</p><div className="slot-mini__meta"><span>Por {author}</span><span>{article.readingTime || "8 min"}</span></div><span className="slot-mini__link">Leer el artículo ↗</span></div><aside className="slot-mini__aside"><span>Estudio / 2026</span><q>La elegancia no es una respuesta…</q></aside></div>,
    homeSelection: <div className="slot-mini slot-mini--selection"><p className="slot-mini__kicker"><i />Selección LIGHT</p><h4 className="slot-mini__section-title">Historias para <em>quedarse.</em></h4><div className="slot-mini__cards"><div className="slot-mini__card is-current"><div className="slot-mini__img">{img}</div><p className="slot-mini__label">{category}</p><h5>{title}</h5><span className="slot-mini__link">Leer historia ↗</span></div><Ghost /><Ghost /></div></div>,
    spotlight: <div className="slot-mini slot-mini--spotlight"><div className="slot-mini__tilt"><div className="slot-mini__img">{img}</div></div><div className="slot-mini__copy"><p className="slot-mini__label">Spotlight / {category}</p><h4 className="slot-mini__display">{title}</h4><p className="slot-mini__dek">{excerpt}</p><span className="slot-mini__link">Abrir spotlight ↗</span></div></div>,
    mustRead: <div className="slot-mini slot-mini--mustreads"><p className="slot-mini__label slot-mini__center">LIGHT / Selección editorial</p><h4 className="slot-mini__center slot-mini__caps">Must-Reads</h4><div className="slot-mini__mr"><div className="slot-mini__mr-lead is-current"><div className="slot-mini__img">{img}</div><p className="slot-mini__label">{category}{date && ` · ${date}`}</p><h5>{title}</h5><span className="slot-mini__by">By {author}</span></div><ol className="slot-mini__mr-list">{["02", "03", "04"].map((n) => <li key={n}><div className="slot-mini__img" /><div><i /><i /></div><b>{n}</b></li>)}</ol></div><p className="slot-mini__hint">Con orden 1 ocupa el lugar grande; con otro número pasa a la lista de la derecha.</p></div>,
    latest: <div className="slot-mini slot-mini--latest"><div className="slot-mini__cards"><div className="slot-mini__card is-current"><div className="slot-mini__img">{img}<b>01</b></div><p className="slot-mini__label">{category}</p><h5>{title}</h5><span className="slot-mini__link">Leer historia ↗</span></div><Ghost className="is-tall" /><Ghost className="is-tall" /></div></div>,
  }[slot.key];
  return <div className="placement-preview"><div className="placement-preview__chrome"><span>{slot.group === "Homepage" ? "light / inicio" : "light / archivo"}</span><strong>{slot.group} · {slot.label}</strong></div><div className="placement-preview__page">{body}</div></div>;
}

export default function ArchivePlacementDialog({ article, onClose, onSaved }: { article: EditorialArticle; onClose: () => void; onSaved: (placement: ArchivePlacement) => void }) {
  const [placement, setPlacement] = useState<ArchivePlacement>({ ...emptyPlacement, ...getArchivePlacements()[article.id] });
  const [focusKey, setFocusKey] = useState<PlacementKey>(() => slots.find((slot) => ({ ...emptyPlacement, ...getArchivePlacements()[article.id] })[slot.key])?.key || "homeSelection");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; void fetchArchivePlacements().then((all) => { if (active && all[article.id]) setPlacement({ ...emptyPlacement, ...all[article.id] }); }); return () => { active = false; }; }, [article.id]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);
  const toggle = (key: PlacementKey) => { setFocusKey(key); setPlacement((value) => ({ ...value, [key]: !value[key] })); };
  const save = async () => { setSaving(true); setError(""); try { await saveArchivePlacement(article.id, placement); onSaved(placement); onClose(); } catch (cause) { setError(`No se pudo guardar la ubicación: ${describeError(cause)}`); } finally { setSaving(false); } };
  const selectedCount = slots.filter((slot) => placement[slot.key]).length;
  const needsOrder = placement.mustRead || placement.homeSelection;
  const focused = slots.find((slot) => slot.key === focusKey) || slots[0];

  return <div className="archive-placement-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="placement-dialog" role="dialog" aria-modal="true" aria-labelledby="archive-placement-title">
      <header className="placement-dialog__head">
        <div><p className="eyebrow">Editorial / Ubicación</p><h2 id="archive-placement-title">¿Dónde aparece “{article.title || "Sin título"}”?</h2></div>
        <button className="placement-dialog__close" type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
      </header>
      <div className="placement-dialog__body">
        <div className="placement-dialog__options">
          {(["Homepage", "Archivo"] as const).map((group) => <fieldset key={group}><legend>{group}</legend>{slots.filter((slot) => slot.group === group).map((slot) => <label key={slot.key} className={`placement-option${placement[slot.key] ? " is-checked" : ""}${focusKey === slot.key ? " is-focused" : ""}`} onMouseEnter={() => setFocusKey(slot.key)} onFocus={() => setFocusKey(slot.key)}>
            <input type="checkbox" checked={placement[slot.key]} onChange={() => toggle(slot.key)} />
            <SlotDiagram slot={slot.key} />
            <span className="placement-option__copy"><strong>{slot.label}</strong><small>{slot.description}</small></span>
            <span className="placement-option__check" aria-hidden="true"><Check size={13} /></span>
          </label>)}</fieldset>)}
          {needsOrder && <label className="placement-order"><span><strong>Orden</strong><small>Posición en {[placement.homeSelection && "Selección", placement.mustRead && "Must-Reads"].filter(Boolean).join(" y ")} (1 = primera).</small></span><input type="number" min="1" max="99" value={placement.order} onChange={(event) => setPlacement((value) => ({ ...value, order: Math.max(1, Number(event.target.value) || 1) }))} /></label>}
        </div>
        <aside className="placement-dialog__preview" aria-label="Vista previa de la ubicación">
          <p className="eyebrow">Vista previa {placement[focused.key] ? "" : "· sin seleccionar"}</p>
          <SlotPreview slot={focused} article={article} />
          <p className="placement-dialog__note">{focused.key === "homeHero" ? "El Hero muestra una sola historia, sin carrusel. Si eliges esta, sustituye a la actual." : focused.usesOrder ? "Comparte orden con las demás historias de esta lista." : "El contenido del artículo no cambia: solo dónde se muestra."}</p>
        </aside>
      </div>
      <footer className="placement-dialog__actions">
        <span>{selectedCount ? `${selectedCount} ${selectedCount === 1 ? "ubicación" : "ubicaciones"}` : "Sin ubicaciones: el artículo solo aparece en su sección"}</span>
        <div><button className="admin-secondary" type="button" onClick={onClose}>Cancelar</button><button className="admin-primary" type="button" onClick={() => void save()} disabled={saving}><Save size={14} /> {saving ? "Guardando…" : "Guardar ubicación"}</button></div>
      </footer>
      {error && <p className="admin-notice admin-notice--error" role="alert">{error}</p>}
    </section>
  </div>;
}
