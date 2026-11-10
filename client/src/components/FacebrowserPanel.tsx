import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { fetchFacebrowserMetrics, type FacebrowserMetrics, type FacebrowserSnapshot } from "@/lib/facebrowser";

const kpis: { key: keyof Pick<FacebrowserSnapshot, "followers" | "posts" | "impressions" | "interactions">; label: string }[] = [
  { key: "followers", label: "Seguidores" },
  { key: "posts", label: "Publicaciones" },
  { key: "impressions", label: "Impresiones" },
  { key: "interactions", label: "Interacciones" },
];

const formatNumber = (value: number) => value.toLocaleString("es-ES");

/** Panel del Resumen con los datos reales de Facebrowser que envía la API (Edge Function facebrowser-ingest). */
export default function FacebrowserPanel() {
  const [metrics, setMetrics] = useState<FacebrowserMetrics | null>(null);
  useEffect(() => { let active = true; void fetchFacebrowserMetrics().then((value) => { if (active) setMetrics(value); }); return () => { active = false; }; }, []);

  const head = <div className="performance-panel__head"><div><p className="eyebrow">Facebrowser · GTA World</p><h2>Redes de LIGHT.</h2></div><span className="facebrowser-panel__badge"><Globe size={14} /> {metrics?.status === "ok" ? `Actualizado ${new Date(metrics.latest.capturedAt).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : "API"}</span></div>;

  if (!metrics) return <article className="performance-panel facebrowser-panel" aria-busy="true">{head}<p className="facebrowser-panel__note">Cargando datos de Facebrowser…</p></article>;

  if (metrics.status !== "ok") {
    const text = metrics.status === "empty"
      ? "La conexión está lista, pero la API todavía no ha enviado datos. En cuanto lo haga, aquí aparecerán seguidores, publicaciones, impresiones e interacciones."
      : metrics.status === "not_configured"
        ? "Espacio reservado para los datos reales de Facebrowser. Falta aplicar la migración facebrowser_metrics y desplegar la función facebrowser-ingest; después, cualquier API o bot puede enviar los datos."
        : `No se pudieron leer los datos de Facebrowser: ${metrics.message}`;
    return <article className="performance-panel facebrowser-panel">{head}<div className="facebrowser-panel__kpis is-pending">{kpis.map((kpi) => <div key={kpi.key}><span>{kpi.label}</span><strong>—</strong></div>)}</div><p className="facebrowser-panel__note">{text}</p></article>;
  }

  const { latest, previous } = metrics;
  return <article className="performance-panel facebrowser-panel">{head}
    <div className="facebrowser-panel__kpis">{kpis.map((kpi) => {
      const value = latest[kpi.key];
      const before = previous?.[kpi.key];
      const delta = value !== null && before !== null && before !== undefined ? value - before : null;
      return <div key={kpi.key}><span>{kpi.label}</span><strong>{value === null ? "—" : formatNumber(value)}</strong>{delta !== null && delta !== 0 && <small className={delta > 0 ? "is-up" : "is-down"}>{delta > 0 ? "+" : "−"}{formatNumber(Math.abs(delta))} desde la anterior</small>}</div>;
    })}</div>
    {latest.profileVisits !== null && <p className="facebrowser-panel__note">{formatNumber(latest.profileVisits)} visitas al perfil · fuente: {latest.source}</p>}
  </article>;
}
