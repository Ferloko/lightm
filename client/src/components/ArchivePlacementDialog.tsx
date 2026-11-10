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

/** How the story looks in the chosen slot, with its own image and texts. */
function SlotPreview({ slot, article }: { slot: Slot; article: EditorialArticle }) {
  const image = article.image ? <img src={article.image} alt="" /> : <span className="placement-preview__empty">LIGHT</span>;
  const title = article.title || "Sin título";
  const kicker = <p className="placement-preview__kicker">{article.category || "Historia"}</p>;
  const body = {
    homeHero: <div className="placement-preview__hero"><div className="placement-preview__media">{image}</div><div>{kicker}<h4>{title}</h4>{article.excerpt && <p>{article.excerpt}</p>}</div></div>,
    homeFeature: <div className="placement-preview__feature"><div className="placement-preview__media">{image}</div><div>{kicker}<h4>{title}</h4>{article.excerpt && <p>{article.excerpt}</p>}<span>Por {article.author || "LIGHT"}</span></div></div>,
    homeSelection: <div className="placement-preview__grid"><div className="placement-preview__card is-current"><div className="placement-preview__media">{image}</div>{kicker}<h4>{title}</h4></div><div className="placement-preview__card"><div className="placement-preview__media" /><i /><i /></div><div className="placement-preview__card"><div className="placement-preview__media" /><i /><i /></div></div>,
    spotlight: <div className="placement-preview__spotlight"><div className="placement-preview__media">{image}</div><div>{kicker}<h4>{title}</h4><span>Leer historia →</span></div></div>,
    mustRead: <ol className="placement-preview__list"><li className="is-current"><b>01</b><div className="placement-preview__thumb">{image}</div><div>{kicker}<h4>{title}</h4></div></li><li><b>02</b><div className="placement-preview__thumb" /><div><i /><i /></div></li><li><b>03</b><div className="placement-preview__thumb" /><div><i /><i /></div></li></ol>,
    latest: <div className="placement-preview__grid placement-preview__grid--four"><div className="placement-preview__card is-current"><div className="placement-preview__media">{image}</div>{kicker}<h4>{title}</h4></div>{[1, 2, 3].map((item) => <div className="placement-preview__card" key={item}><div className="placement-preview__media" /><i /><i /></div>)}</div>,
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
