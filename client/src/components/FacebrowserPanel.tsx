import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe, History, PenLine, Save, X } from "lucide-react";
import { fetchFacebrowserMetrics, saveFacebrowserSnapshot, type FacebrowserCounts, type FacebrowserMetrics, type FacebrowserSnapshot } from "@/lib/facebrowser";
import { describeError } from "@/lib/supabase";

type CountKey = keyof FacebrowserCounts;
const fields: { key: CountKey; label: string }[] = [
  { key: "followers", label: "Seguidores" },
  { key: "posts", label: "Publicaciones" },
  { key: "impressions", label: "Impresiones" },
  { key: "interactions", label: "Interacciones" },
  { key: "profileVisits", label: "Visitas al perfil" },
];
// Impresiones e interacciones ya no se escriben a mano: se suman de los artículos publicados.
const editableFields = fields.filter(({ key }) => key !== "impressions" && key !== "interactions");
const historyFields = editableFields;
const formatNumber = (value: number) => value.toLocaleString("es-ES");
const formatWhen = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Curva de seguidores de las últimas actualizaciones, con un punto por foto (hover = valor y fecha). */
function FollowersSpark({ history }: { history: FacebrowserSnapshot[] }) {
  const points = history.filter((item) => item.followers !== null).slice(0, 12).reverse();
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const values = points.map((item) => item.followers as number);
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const x = (index: number) => 6 + (index / (points.length - 1)) * 288;
  const y = (value: number) => 54 - ((value - min) / span) * 44;
  const path = points.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(item.followers as number).toFixed(1)}`).join(" ");
  const active = hover !== null ? points[hover] : points[points.length - 1];
  return <div className="facebrowser-spark">
    <svg viewBox="0 0 300 60" role="img" aria-label="Evolución de seguidores" onMouseLeave={() => setHover(null)}>
      <path className="facebrowser-spark__line" d={path} />
      {points.map((item, index) => <circle key={item.capturedAt} cx={x(index)} cy={y(item.followers as number)} r={hover === index ? 4.5 : 3} className={hover === index ? "is-active" : ""} onMouseEnter={() => setHover(index)} />)}
    </svg>
    <span><b>{formatNumber(active.followers as number)}</b> seguidores · {formatWhen(active.capturedAt)}</span>
  </div>;
}

/**
 * Redes de LIGHT en el Resumen. Las cifras llegan de la API (Edge Function facebrowser-ingest) o las
 * escriben a mano Owner/Admin con “Actualizar cifras”; cada actualización queda en el historial.
 */
export type ArticleSocialTotals = { impressions: number; clicks: number } | null;

export default function FacebrowserPanel({ canEdit = false, editorName = "", articleTotals = null, articlesPending = false }: { canEdit?: boolean; editorName?: string; articleTotals?: ArticleSocialTotals; articlesPending?: boolean }) {
  const [metrics, setMetrics] = useState<FacebrowserMetrics | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<CountKey, string>>({ followers: "", posts: "", impressions: "", interactions: "", profileVisits: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const load = useCallback(() => fetchFacebrowserMetrics("light", 50).then(setMetrics), []);
  useEffect(() => { void load(); }, [load]);

  const latest = metrics?.status === "ok" ? metrics.latest : null;
  const previous = metrics?.status === "ok" ? metrics.previous : null;
  const history = useMemo(() => metrics?.status === "ok" ? metrics.history : [], [metrics]);
  const startEdit = () => { setDraft(Object.fromEntries(editableFields.map(({ key }) => [key, latest?.[key] === null || latest?.[key] === undefined ? "" : String(latest[key])])) as Record<CountKey, string>); setError(""); setEditing(true); };
  const save = async () => {
    const counts = { followers: null, posts: null, impressions: null, interactions: null, profileVisits: null } as FacebrowserCounts;
    for (const { key, label } of editableFields) {
      const raw = draft[key].replace(/[.\s]/g, "").trim();
      if (raw === "") { counts[key] = null; continue; }
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) { setError(`“${label}” debe ser un número entero sin signo.`); return; }
      counts[key] = value;
    }
    if (editableFields.every(({ key }) => counts[key] === null)) { setError("Escribe al menos una cifra."); return; }
    setSaving(true); setError("");
    try { await saveFacebrowserSnapshot(counts, editorName); await load(); setEditing(false); }
    catch (cause) { setError(`No se pudo guardar: ${describeError(cause)}`); }
    finally { setSaving(false); }
  };

  const kpiList: { key: CountKey; label: string; derived?: (totals: NonNullable<ArticleSocialTotals>) => number }[] = [
    { key: "followers", label: "Seguidores" },
    { key: "posts", label: "Publicaciones" },
    { key: "impressions", label: "Impresiones", derived: (totals) => totals.impressions },
    { key: "interactions", label: "Interacciones", derived: (totals) => totals.clicks },
  ];
  const head = <div className="performance-panel__head"><div><p className="eyebrow">Facebrowser · GTA World</p><h2>Redes de LIGHT.</h2></div><div className="facebrowser-panel__actions">
    <span className="facebrowser-panel__badge"><Globe size={14} /> {latest ? `Actualizado ${formatWhen(latest.capturedAt)}` : "Sin datos"}</span>
    {history.length > 1 && <button type="button" className="performance-link" onClick={() => setShowHistory((value) => !value)} aria-expanded={showHistory}><History size={13} /> Historial · {history.length}</button>}
    {canEdit && !editing && <button type="button" className="admin-secondary" onClick={startEdit}><PenLine size={13} /> Actualizar cifras</button>}
  </div></div>;

  if (!metrics) return <article className="performance-panel facebrowser-panel" aria-busy="true">{head}<p className="facebrowser-panel__note">Cargando datos de Facebrowser…</p></article>;

  return <article className="performance-panel facebrowser-panel">{head}
    {editing ? <form className="facebrowser-edit" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <p className="facebrowser-panel__note">Escribe las cifras actuales de la página de LIGHT en Facebrowser. Se guardan con la fecha de hoy y tu nombre; las anteriores quedan en el historial. Impresiones e interacciones se calculan solas con los artículos. Deja vacío lo que no sepas.</p>
      <div className="facebrowser-edit__grid">{editableFields.map(({ key, label }) => <label key={key}>{label}<input inputMode="numeric" value={draft[key]} onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.value }))} placeholder={latest?.[key] !== null && latest?.[key] !== undefined ? formatNumber(latest[key] as number) : "0"} /></label>)}</div>
      {error && <p className="facebrowser-edit__error" role="alert">{error}</p>}
      <div className="facebrowser-edit__actions"><button type="button" className="admin-secondary" onClick={() => setEditing(false)}><X size={13} /> Cancelar</button><button type="submit" className="admin-primary" disabled={saving}><Save size={13} /> {saving ? "Guardando…" : "Guardar cifras"}</button></div>
    </form> : <>
      <div className={`facebrowser-panel__kpis${latest ? "" : " is-pending"}`}>{kpiList.map((kpi) => {
        if (kpi.derived) return <div key={kpi.key} title="Suma de los artículos publicados en el periodo del Resumen"><span>{kpi.label}</span><strong>{articlesPending ? "…" : articleTotals ? formatNumber(kpi.derived(articleTotals)) : "—"}</strong><small>de los artículos</small></div>;
        const value = latest?.[kpi.key] ?? null;
        const before = previous?.[kpi.key];
        const delta = value !== null && before !== null && before !== undefined ? value - before : null;
        return <div key={kpi.key} title={previous ? `Anterior (${formatWhen(previous.capturedAt)}): ${before === null || before === undefined ? "—" : formatNumber(before)}` : undefined}><span>{kpi.label}</span><strong>{value === null ? "—" : formatNumber(value)}</strong>{delta !== null && delta !== 0 && <small className={delta > 0 ? "is-up" : "is-down"}>{delta > 0 ? "▲ +" : "▼ −"}{formatNumber(Math.abs(delta))} desde la anterior</small>}</div>;
      })}</div>
      {latest ? <div className="facebrowser-panel__foot"><FollowersSpark history={history} /><p className="facebrowser-panel__note">{latest.profileVisits !== null && <>{formatNumber(latest.profileVisits)} visitas al perfil · </>}Fuente: {latest.source}</p></div>
        : <p className="facebrowser-panel__note">{metrics.status === "error" ? `No se pudieron leer los datos de Facebrowser: ${metrics.message}` : canEdit ? "Aún no hay cifras. Pulsa “Actualizar cifras” para escribir las de la página de LIGHT en Facebrowser." : "Aún no hay cifras de Facebrowser."}</p>}
    </>}
    {showHistory && !editing && <div className="facebrowser-history"><table><thead><tr><th>Fecha</th>{historyFields.map(({ key, label }) => <th key={key}>{label}</th>)}<th>Fuente</th></tr></thead><tbody>{history.map((item) => <tr key={`${item.capturedAt}-${item.source}`}><td>{formatWhen(item.capturedAt)}</td>{historyFields.map(({ key }) => <td key={key}>{item[key] === null ? "—" : formatNumber(item[key] as number)}</td>)}<td>{item.source}</td></tr>)}</tbody></table></div>}
  </article>;
}
