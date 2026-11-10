import { useMemo, useState } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import type { EditorialArticle } from "@/lib/editorial";
import { formatDuration, rate, SOURCE_LABELS, type ArticleStats, type ArticleStatsResult } from "@/lib/articleAnalytics";

type SortKey = "views" | "impressions" | "clicks" | "ctr" | "completion" | "avgSeconds" | "likes" | "shares";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "views", label: "Visitas" },
  { key: "impressions", label: "Impresiones" },
  { key: "clicks", label: "Clics" },
  { key: "ctr", label: "CTR" },
  { key: "completion", label: "Lectura completa" },
  { key: "avgSeconds", label: "Tiempo medio" },
  { key: "likes", label: "Me gusta" },
  { key: "shares", label: "Compartidos" },
];
const PERIODS = [7, 30, 90];
const fmt = (value: number) => value.toLocaleString("es-ES");
const sortValue = (stats: ArticleStats, key: SortKey) => key === "ctr" ? (stats.impressions ? stats.clicks / stats.impressions : -1) : key === "completion" ? (stats.views ? stats.reads100 / stats.views : -1) : stats[key];

/** Una línea de estadísticas para la fila del artículo en la lista de Páginas. */
export function ArticleRowStats({ stats }: { stats?: ArticleStats }) {
  if (!stats) return null;
  return <span className="article-row-stats"><BarChart3 size={12} /> {fmt(stats.views)} visitas · {fmt(stats.visitors)} lectores · {fmt(stats.impressions)} impresiones · CTR {rate(stats.clicks, stats.impressions)} · ♥ {fmt(stats.likes)}</span>;
}

export default function ArticleStatsPanel({ articles, result, days, onDaysChange }: { articles: EditorialArticle[]; result: ArticleStatsResult | null; days: number; onDaysChange: (days: number) => void }) {
  const [sort, setSort] = useState<SortKey>("views");
  const [open, setOpen] = useState<string | null>(null);
  const stats = result?.status === "ok" ? result.stats : {};
  const rows = useMemo(() => articles.map((article) => ({ article, stats: stats[article.id] })).filter((row): row is { article: EditorialArticle; stats: ArticleStats } => Boolean(row.stats)).sort((a, b) => sortValue(b.stats, sort) - sortValue(a.stats, sort)), [articles, stats, sort]);
  const totals = rows.reduce((sum, { stats: item }) => ({ impressions: sum.impressions + item.impressions, clicks: sum.clicks + item.clicks, views: sum.views + item.views, visitors: sum.visitors + item.visitors, reads100: sum.reads100 + item.reads100, seconds: sum.seconds + item.avgSeconds * item.views, shares: sum.shares + item.shares }), { impressions: 0, clicks: 0, views: 0, visitors: 0, reads100: 0, seconds: 0, shares: 0 });

  return <section className="article-stats" aria-label="Rendimiento de los artículos">
    <div className="article-stats__head">
      <div><p className="eyebrow">Rendimiento</p><h3>Cómo se leen tus artículos.</h3></div>
      <div className="article-stats__periods" role="group" aria-label="Periodo">{PERIODS.map((value) => <button key={value} type="button" className={days === value ? "is-active" : ""} onClick={() => onDaysChange(value)}>{value} días</button>)}</div>
    </div>
    {!result ? <p className="article-stats__note">Cargando estadísticas…</p>
      : result.status === "not_configured" ? <p className="article-stats__note">Falta aplicar la migración <code>20261114_article_analytics.sql</code> en Supabase para ver estas estadísticas.</p>
      : result.status === "error" ? <p className="article-stats__note article-stats__note--error">No se pudieron leer las estadísticas: {result.message}</p>
      : <>
        <dl className="article-stats__kpis">
          <div><dt>Impresiones</dt><dd>{fmt(totals.impressions)}</dd><small>Veces que una tarjeta apareció en pantalla</small></div>
          <div><dt>Clics</dt><dd>{fmt(totals.clicks)}</dd><small>CTR {rate(totals.clicks, totals.impressions)}</small></div>
          <div><dt>Visitas</dt><dd>{fmt(totals.views)}</dd><small>{fmt(totals.visitors)} {totals.visitors === 1 ? "lector único" : "lectores únicos"}</small></div>
          <div><dt>Lectura completa</dt><dd>{rate(totals.reads100, totals.views)}</dd><small>Llegaron al final</small></div>
          <div><dt>Tiempo medio</dt><dd>{formatDuration(totals.views ? totals.seconds / totals.views : 0)}</dd><small>{fmt(totals.shares)} {totals.shares === 1 ? "compartido" : "compartidos"}</small></div>
        </dl>
        <div className="article-stats__sort"><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>{SORTS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div>
        {rows.length === 0 ? <p className="article-stats__note">Todavía no hay artículos publicados.</p> : <div className="article-stats__table" role="table">
          <div className="article-stats__row article-stats__row--head" role="row"><span role="columnheader">Artículo</span><span role="columnheader">Impr.</span><span role="columnheader">Clics</span><span role="columnheader">CTR</span><span role="columnheader">Visitas</span><span role="columnheader">Lectores</span><span role="columnheader">Mitad</span><span role="columnheader">Final</span><span role="columnheader">Tiempo</span><span role="columnheader">♥</span><span role="columnheader">Compart.</span></div>
          {rows.map(({ article, stats: item }, index) => {
            const sources = Object.entries(item.clickSources).sort((a, b) => b[1] - a[1]);
            const isOpen = open === article.id;
            return <div className="article-stats__group" key={article.id}>
              <button type="button" className={`article-stats__row${isOpen ? " is-open" : ""}`} role="row" onClick={() => setOpen(isOpen ? null : article.id)} aria-expanded={isOpen}>
                <span className="article-stats__title" role="cell"><b>{String(index + 1).padStart(2, "0")}</b>{article.title || "Sin título"}<ChevronDown size={13} /></span>
                <span role="cell">{fmt(item.impressions)}</span><span role="cell">{fmt(item.clicks)}</span><span role="cell">{rate(item.clicks, item.impressions)}</span>
                <span role="cell">{fmt(item.views)}</span><span role="cell">{fmt(item.visitors)}</span>
                <span role="cell">{rate(item.reads50, item.views)}</span><span role="cell">{rate(item.reads100, item.views)}</span>
                <span role="cell">{formatDuration(item.avgSeconds)}</span><span role="cell">{fmt(item.likes)}</span><span role="cell">{fmt(item.shares)}</span>
              </button>
              {isOpen && <div className="article-stats__sources">
                <p className="eyebrow">Clics por origen</p>
                {sources.length ? sources.map(([source, count]) => <div className="article-stats__bar" key={source}><span>{SOURCE_LABELS[source] || source}</span><i style={{ width: `${Math.max(4, (count / item.clicks) * 100)}%` }} /><b>{fmt(count)}</b></div>) : <p className="article-stats__note">Aún no hay clics registrados desde las tarjetas.</p>}
              </div>}
            </div>;
          })}
        </div>}
        <p className="article-stats__legend">Impresión: la tarjeta estuvo visible al menos un 50 % durante medio segundo. CTR: clics ÷ impresiones. Mitad/Final: porcentaje de visitas que llegaron a la mitad o al final del artículo. Los datos son anónimos.</p>
      </>}
  </section>;
}
