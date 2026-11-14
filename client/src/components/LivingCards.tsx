import type { CSSProperties } from "react";
import { livingCriteria, livingOverall, type LivingItem } from "@/lib/living";

/* Piezas de la guía Living. Las usa la página pública y la vista previa del Dashboard. */

export const fmtScore = (value: number) => value.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Cinco marcas LIGHT, rellenas hasta la nota (con medias marcas). */
export function Rating({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  return <span className={`living-rating living-rating--${size}`} aria-label={`${fmtScore(value)} sobre 5`}><strong>{fmtScore(value)}</strong><span className="living-rating__marks" aria-hidden="true">{[1, 2, 3, 4, 5].map((mark) => <i key={mark} style={{ "--fill": `${Math.max(0, Math.min(1, value - mark + 1)) * 100}%` } as CSSProperties} />)}</span></span>;
}
export const Price = ({ level }: { level: number }) => <span className="living-price" aria-label={`Precio ${level} de 4`}>{[1, 2, 3, 4].map((step) => <b key={step} className={step <= level ? "is-on" : ""}>$</b>)}</span>;
export function GuideImage({ src, alt = "", position }: { src: string; alt?: string; position?: string }) {
  if (!src) return null;
  return <img src={src} alt={alt} loading="lazy" style={position ? { objectPosition: position } : undefined} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />;
}
const meta = (...parts: string[]) => parts.filter(Boolean).join(" · ");

/** El resort destacado: “LIGHT Pick · N.º 1”. */
export function LivingCover({ item }: { item: LivingItem }) {
  return <article className="lg-cover" id={item.id}>
    <div className="lg-cover__media"><GuideImage src={item.image} alt={item.name} /><span className="lg-badge">LIGHT Pick · N.º 1</span></div>
    <div className="lg-cover__body">
      <p className="lg-meta">{meta(item.category, item.place)}</p>
      <h3>{item.name || "Nombre del resort"}</h3>
      <Rating value={livingOverall(item.scores)} size="lg" />
      {item.verdict && <blockquote>“{item.verdict}”</blockquote>}
      <dl className="lg-scores">{livingCriteria.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><span><i style={{ width: `${(item.scores[key] / 5) * 100}%` }} /></span><b>{fmtScore(item.scores[key])}</b></dd></div>)}</dl>
      <div className="lg-cover__foot">{item.idealFor && <span><small>Ideal para</small>{item.idealFor}</span>}<span><small>Precio</small><Price level={item.price} /></span></div>
    </div>
  </article>;
}

export function LivingReview({ item }: { item: LivingItem }) {
  return <article className="lg-review" id={item.id}>
    <div className="lg-review__media"><GuideImage src={item.image} alt={item.name} /><span className="lg-review__score"><Rating value={livingOverall(item.scores)} size="sm" /></span></div>
    <p className="lg-meta">{meta(item.category, item.place)}</p>
    <h3>{item.name || "Nombre del resort"}</h3>
    <p className="lg-review__verdict">{item.verdict}</p>
    <dl className="lg-scores lg-scores--compact">{livingCriteria.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><span><i style={{ width: `${(item.scores[key] / 5) * 100}%` }} /></span></dd></div>)}</dl>
    <div className="lg-review__foot"><span>{item.idealFor}</span><Price level={item.price} /></div>
  </article>;
}

export function LivingRank({ item, position }: { item: LivingItem; position: number }) {
  return <li className="lg-rank" id={item.id}>
    <span className="lg-rank__number">{String(position).padStart(2, "0")}</span>
    <div className="lg-rank__media"><GuideImage src={item.image} alt={item.name} /></div>
    <div className="lg-rank__main"><h3>{item.name || "Nombre del restaurante"}</h3><p className="lg-meta">{meta(item.category, item.place)}</p><p className="lg-rank__verdict">{item.verdict}</p></div>
    <div className="lg-rank__side"><Rating value={item.score} /><Price level={item.price} />{item.signature && <small>Pedir: {item.signature}</small>}</div>
  </li>;
}

export function LivingNight({ item }: { item: LivingItem }) {
  return <article className="lg-night" id={item.id}>
    <div className="lg-night__media"><GuideImage src={item.image} alt="" />{item.date && <span className="lg-night__date">{item.date}</span>}</div>
    <div className="lg-night__body"><p className="lg-meta">{item.category}</p><h3>{item.name || "Nombre del evento"}</h3><p>{item.verdict}</p><div className="lg-night__foot"><Rating value={item.score} size="sm" /><span className={`lg-status lg-status--${item.status === "Abierto" ? "open" : item.status === "Lista de espera" ? "wait" : "few"}`}>{item.status}</span></div></div>
  </article>;
}
