import { CalendarDays, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { describeError, supabase } from "@/lib/supabase";
import { addDaysKey, CAMPAIGN_CHANNELS, campaignCtr, campaignMetricsAvailable, campaignProgress, campaignRoas, campaignStatus, campaignStatusLabel, deleteCampaign, emptyMetrics, saveCampaign, sortCampaigns, todayKey, type Campaign, type CampaignMetrics, type CampaignStatus } from "@/lib/campaigns";

const colors = ["acid", "blue", "soft"];
type Filter = CampaignStatus | "all";
type Props = { campaigns: Campaign[]; onChange: (campaigns: Campaign[]) => void; readOnly?: boolean; focus?: { id: string | null; nonce: number } | null; onFocusHandled?: () => void };

const integer = new Intl.NumberFormat("es-ES", { useGrouping: "always" } as Intl.NumberFormatOptions);
const money = (value: number) => `$${integer.format(Math.round(value))}`;
const metricFields: { key: keyof CampaignMetrics; label: string; prefix?: string; step: string }[] = [
  { key: "budget", label: "Presupuesto", prefix: "$", step: "0.01" },
  { key: "spend", label: "Invertido (ad spend)", prefix: "$", step: "0.01" },
  { key: "impressions", label: "Impresiones", step: "1" },
  { key: "clicks", label: "Clics", step: "1" },
  { key: "conversions", label: "Conversiones", step: "1" },
  { key: "revenue", label: "Ingresos (revenue)", prefix: "$", step: "0.01" },
];
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");

export default function CampaignBoard({ campaigns, onChange, readOnly = false, focus, onFocusHandled }: Props) {
  const [draft, setDraft] = useState<Partial<Campaign> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const sorted = useMemo(() => sortCampaigns(campaigns), [campaigns]);
  const counts = useMemo(() => sorted.reduce((acc, campaign) => { acc[campaignStatus(campaign)] += 1; return acc; }, { active: 0, scheduled: 0, ended: 0 } as Record<CampaignStatus, number>), [sorted]);
  const visible = filter === "all" ? sorted : sorted.filter((campaign) => campaignStatus(campaign) === filter);

  const openNew = () => { if (readOnly) return; const today = todayKey(); setError(""); setDraft({ name: "", description: "", startDate: today, endDate: addDaysKey(today, 30), color: "acid", channel: "social", ...emptyMetrics }); };
  const openCampaign = (campaign: Campaign) => { setError(""); setDraft(campaign); };

  // Opened from the overview, the sidebar or the calendar. The request is consumed once, so coming back
  // to Campañas later does not reopen the same campaign (or a blank draft).
  useEffect(() => {
    if (!focus) return;
    if (focus.id) { const target = campaigns.find((campaign) => campaign.id === focus.id); if (target) openCampaign(target); }
    else openNew();
    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);
  useEffect(() => { if (!draft) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setDraft(null); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [draft]);

  const save = async () => {
    if (readOnly || !draft?.name?.trim() || !draft.startDate || !draft.endDate) return;
    if (draft.endDate < draft.startDate) { setError("La fecha final no puede ser anterior al inicio."); return; }
    if ((draft.clicks || 0) > (draft.impressions || 0) && (draft.impressions || 0) > 0) { setError("Los clics no pueden superar las impresiones."); return; }
    setError(""); setSaving(true);
    try {
      const saved = await saveCampaign({ id: draft.id, name: draft.name.trim(), description: draft.description || "", startDate: draft.startDate, endDate: draft.endDate, color: draft.color || "acid", channel: draft.channel || "social", createdAt: draft.createdAt, ...Object.fromEntries(metricFields.map(({ key }) => [key, Number(draft[key]) || 0])) as CampaignMetrics });
      onChange(sortCampaigns([...campaigns.filter((item) => item.id !== saved.id && item.id !== draft.id), saved]));
      setDraft(null);
      if (supabase && !campaignMetricsAvailable) setError("La campaña se guardó, pero las métricas necesitan la migración 20261111_campaign_metrics_and_visitors.sql en Supabase.");
    } catch (cause) { setError(`No se pudo guardar la campaña: ${describeError(cause)}`); }
    finally { setSaving(false); }
  };
  const removeCampaign = async (campaign: Partial<Campaign> | null) => { if (readOnly || !campaign?.id || !window.confirm(`¿Eliminar la campaña “${campaign.name || ""}”?`)) return; try { await deleteCampaign(campaign.id); onChange(campaigns.filter((item) => item.id !== campaign.id)); setDraft(null); } catch (cause) { setError(`No se pudo eliminar: ${describeError(cause)}`); } };

  const draftCtr = draft?.impressions ? (Number(draft.clicks) || 0) / draft.impressions : null;
  const draftRoas = draft?.spend ? (Number(draft.revenue) || 0) / draft.spend : null;
  const filters: { id: Filter; label: string; count: number }[] = [{ id: "all", label: "Todas", count: sorted.length }, { id: "active", label: "Activas", count: counts.active }, { id: "scheduled", label: "Programadas", count: counts.scheduled }, { id: "ended", label: "Finalizadas", count: counts.ended }];

  return <section className="campaign-board">
    <div className="campaign-board__heading"><div><p className="eyebrow">LIGHT / Campaign studio</p><h2>Campañas.</h2><p>Define la ventana, el canal y las métricas de cada campaña. Alimentan los contadores del Resumen, y las activas se agrupan (hasta tres) en la barra lateral.</p></div>{!readOnly && <button className="admin-primary" type="button" onClick={openNew}><Plus size={15} /> Nueva campaña</button>}</div>
    {error && <p className="admin-notice admin-notice--error" role="alert">{error}</p>}
    {sorted.length > 0 && <div className="campaign-filters" role="tablist">{filters.map((item) => <button type="button" role="tab" aria-selected={filter === item.id} key={item.id} className={filter === item.id ? "is-active" : ""} onClick={() => setFilter(item.id)}>{item.label} <b>{item.count}</b></button>)}</div>}
    <div className="campaign-list">
      {sorted.length === 0 ? <div className="admin-empty"><Target size={24} /><p className="eyebrow">Todavía no hay campañas</p><h2>La primera empieza aquí.</h2>{!readOnly && <button className="admin-primary" type="button" onClick={openNew}>Crear campaña <Plus size={15} /></button>}</div>
        : visible.length === 0 ? <p className="campaign-table__empty">No hay campañas {filters.find((item) => item.id === filter)?.label.toLowerCase()}.</p>
        : visible.map((campaign) => { const status = campaignStatus(campaign); const ctr = campaignCtr(campaign); const roas = campaignRoas(campaign); return <article className={`campaign-card campaign-card--${campaign.color} campaign-card--${status}`} key={campaign.id} onClick={() => openCampaign(campaign)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") openCampaign(campaign); }}>
          <div className="campaign-card__mark"><Target size={19} /></div>
          <div className="campaign-card__copy">
            <div><span className={`campaign-state campaign-state--${status}`}>{status === "active" ? "Activa ahora" : campaignStatusLabel[status]} · {CAMPAIGN_CHANNELS.find((item) => item.id === campaign.channel)?.label}</span><h3>{campaign.name}</h3></div>
            <p>{campaign.description || "Sin descripción."}</p>
            <small><CalendarDays size={13} /> {shortDate(campaign.startDate)} — {shortDate(campaign.endDate)}</small>
            <div className="campaign-progress" aria-label={`${Math.round(campaignProgress(campaign) * 100)}% del periodo transcurrido`}><i style={{ width: `${campaignProgress(campaign) * 100}%` }} /></div>
            <dl className="campaign-metrics"><div><dt>Invertido</dt><dd>{money(campaign.spend)}{campaign.budget ? <small> / {money(campaign.budget)}</small> : null}</dd></div><div><dt>Impresiones</dt><dd>{integer.format(campaign.impressions)}</dd></div><div><dt>CTR</dt><dd>{ctr === null ? "—" : `${(ctr * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`}</dd></div><div><dt>Conversiones</dt><dd>{integer.format(campaign.conversions)}</dd></div><div><dt>ROAS</dt><dd>{roas === null ? "—" : `${roas.toLocaleString("es-ES", { maximumFractionDigits: 2 })}×`}</dd></div></dl>
          </div>
          {!readOnly && <div className="campaign-card__actions"><button type="button" onClick={(event) => { event.stopPropagation(); openCampaign(campaign); }} aria-label="Editar campaña"><Pencil size={15} /></button><button type="button" onClick={(event) => { event.stopPropagation(); void removeCampaign(campaign); }} aria-label="Eliminar campaña"><Trash2 size={15} /></button></div>}
        </article>; })}
    </div>
    {draft && <div className="campaign-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}><form className="campaign-modal" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <button className="campaign-modal__close" type="button" onClick={() => setDraft(null)} aria-label="Cerrar"><X size={18} /></button>
      <p className="eyebrow">Campaña editorial</p><h3>{readOnly ? draft.name : draft.id ? "Editar campaña" : "Nueva campaña"}</h3>
      {error && <p className="admin-notice admin-notice--error" role="alert">{error}</p>}
      <fieldset className="campaign-modal__fields" disabled={readOnly}>
        <label>Nombre<input autoFocus value={draft.name || ""} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="LIGHT / Edición 07" required /></label>
        <label>Descripción<textarea value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Qué reúne esta campaña..." rows={2} /></label>
        <div className="campaign-modal__dates"><label>Inicio<input type="date" value={draft.startDate || ""} onChange={(event) => setDraft({ ...draft, startDate: event.target.value, endDate: draft.endDate && draft.endDate < event.target.value ? event.target.value : draft.endDate })} required /></label><label>Final<input type="date" min={draft.startDate} value={draft.endDate || ""} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} required /></label></div>
        <div className="campaign-modal__dates"><label>Canal<select value={draft.channel || "social"} onChange={(event) => setDraft({ ...draft, channel: event.target.value as Campaign["channel"] })}>{CAMPAIGN_CHANNELS.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.detail}</option>)}</select></label><div className="calendar-modal__colors"><span>Color</span>{colors.map((color) => <button type="button" key={color} className={`calendar-color calendar-color--${color} ${draft.color === color ? "is-active" : ""}`} onClick={() => setDraft({ ...draft, color })} aria-label={`Color ${color}`} />)}</div></div>
        <p className="campaign-modal__section">Métricas · alimentan el Resumen</p>
        <div className="campaign-modal__metrics">{metricFields.map((field) => <label key={field.key}>{field.label}<span className="campaign-input">{field.prefix && <em>{field.prefix}</em>}<input type="number" inputMode="decimal" min="0" step={field.step} value={draft[field.key] ? String(draft[field.key]) : ""} placeholder="0" onChange={(event) => setDraft({ ...draft, [field.key]: Math.max(0, Number(event.target.value) || 0) })} /></span></label>)}</div>
        <p className="campaign-modal__derived">CTR <b>{draftCtr === null ? "—" : `${(draftCtr * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`}</b> · ROAS <b>{draftRoas === null ? "—" : `${draftRoas.toLocaleString("es-ES", { maximumFractionDigits: 2 })}×`}</b>{draft.budget ? <> · Presupuesto usado <b>{Math.round(((Number(draft.spend) || 0) / draft.budget) * 100)}%</b></> : null}</p>
      </fieldset>
      <div className="campaign-modal__actions">{draft.id && !readOnly && <button className="admin-secondary campaign-delete" type="button" onClick={() => void removeCampaign(draft)}><Trash2 size={14} /> Eliminar</button>}<button className="admin-secondary" type="button" onClick={() => setDraft(null)}>{readOnly ? "Cerrar" : "Cancelar"}</button>{!readOnly && <button className="admin-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar campaña"}</button>}</div>
    </form></div>}
  </section>;
}
