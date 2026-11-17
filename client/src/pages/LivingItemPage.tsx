import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { SiteFooter } from "@/components/EditorialPageLayout";
import LivingHeader from "@/components/LivingHeader";
import { fmtScore, GuideImage, livingMeta, Price, Rating } from "@/components/LivingCards";
import { arrangeLivingGuide, livingAnchor, livingBlocks, livingCategoryOf, livingCriteria, livingHref, livingScoreOf, useLivingGuide, type LivingCategory, type LivingGuide, type LivingItem } from "@/lib/living";
import { safeImageUrl } from "@/lib/utils";

/* Hoja individual de un elemento de LIGHT Living: /living/<slug>. Se edita en Dashboard → Living. */


/** Tarjeta pequeña para “Más en la guía”. */
function MiniCard({ item }: { item: LivingItem }) {
  return <Link className="lgd-mini" href={livingHref(item)}>
    <span className="lgd-mini__media"><GuideImage src={item.image} alt="" /></span>
    <span className="lg-meta">{livingMeta(item.category, item.place)}</span>
    <strong>{item.name}</strong>
    <span className="lgd-mini__foot"><Rating value={livingScoreOf(item)} size="sm" /><ArrowUpRight size={16} strokeWidth={1.4} /></span>
  </Link>;
}

/** El contenido de la hoja (sin cabecera ni pie): lo usan la página pública y la vista previa del Dashboard. */
export function LivingItemView({ guide, item, category: cat }: { guide: LivingGuide; item: LivingItem; category: LivingCategory }) {
  const section = arrangeLivingGuide(guide).find((entry) => entry.category.id === cat.id);
  const detailed = cat.format === "resort";
  const rank = !detailed && section ? section.items.findIndex((entry) => entry.id === item.id) + 1 : 0;
  const isPick = detailed && section?.cover?.id === item.id;
  const blocks = livingBlocks(item.body);
  const more = guide.items.filter((entry) => entry.categoryId === item.categoryId && entry.id !== item.id).slice(0, 3);
  const facts: [string, React.ReactNode][] = (detailed ? [["Tipo", item.category], ["Zona", item.place], [cat.detailLabel, item.idealFor], ["Precio", <Price level={item.price} />]]
    : [["Tipo", item.category], ["Zona", item.place], [cat.detailLabel, item.signature], ["Ranking LIGHT", rank ? `N.º ${rank}` : ""], ["Precio", <Price level={item.price} />]]) as [string, React.ReactNode][];

  return <main>
      <section className="lgd-hero">
        <div className="lgd-hero__media">
          <GuideImage src={item.image} alt={item.name} />
          {isPick ? <span className="lg-badge">LIGHT Pick · N.º 1</span> : rank ? <span className="lg-badge">Ranking LIGHT · N.º {rank}</span> : null}
        </div>
        <div className="lgd-hero__copy">
          <Link className="lgd-back" href={`/living#${livingAnchor(cat)}`}><ArrowLeft size={14} /> The Guide · {cat.label}</Link>
          <p className="lg-meta">{livingMeta(cat.singular, item.category, item.place)}</p>
          <h1>{item.name}</h1>
          <Rating value={livingScoreOf(item)} size="lg" />
          {item.verdict && <blockquote>“{item.verdict}”</blockquote>}
          {item.location && <p className="lgd-location"><MapPin size={14} strokeWidth={1.5} /> {item.location}</p>}
        </div>
      </section>

      <section className="lgd-body">
        <article className="lgd-article">
          <p className="eyebrow">La reseña LIGHT</p>
          {blocks.length ? blocks.map((block, index) => block.type === "text" ? <p key={index}>{block.text}</p> : safeImageUrl(block.src) ? <figure className="lgd-article__figure" key={index}><GuideImage src={safeImageUrl(block.src)} alt={block.caption || `${item.name}, imagen de la reseña`} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure> : null) : <p>{item.verdict || "La reseña completa llegará pronto."}</p>}
        </article>
        <aside className="lgd-aside">
          <div className="lgd-score">
            <p className="eyebrow">La nota LIGHT</p>
            <Rating value={livingScoreOf(item)} size="lg" />
            {detailed && <dl className="lg-scores">{livingCriteria.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><span><i style={{ width: `${(item.scores[key] / 5) * 100}%` }} /></span><b>{fmtScore(item.scores[key])}</b></dd></div>)}</dl>}
            <small>{livingScoreOf(item) >= 4.5 ? "Recomendación sin reservas." : "Cada criterio se puntúa de 1 a 5; la nota final es su media."}</small>
          </div>
          <dl className="lgd-facts">{facts.filter(([, value]) => value !== "" && value !== null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}{item.location && <div><dt>Ubicación</dt><dd>{item.location}</dd></div>}</dl>
        </aside>
      </section>

      {item.gallery.length > 0 && <section className="lgd-gallery" aria-label="Galería">
        {item.gallery.map((src, index) => <figure key={`${src}-${index}`} className={index === 0 && item.gallery.length % 2 === 1 ? "is-wide" : ""}><GuideImage src={src} alt={`${item.name}, imagen ${index + 1}`} /></figure>)}
      </section>}

      {more.length > 0 && <section className="lg-section lgd-more">
        <header className="lg-section__head"><p className="eyebrow">{cat.label}</p><h2>Más en <em>la guía.</em></h2><Link className="lg-link" href={`/living#${livingAnchor(cat)}`}>Ver todos <ArrowUpRight size={14} /></Link></header>
        <div className="lgd-more__grid">{more.map((entry) => <MiniCard item={entry} key={entry.id} />)}</div>
      </section>}
    </main>;
}

export default function LivingItemPage() {
  const [, params] = useRoute("/living/:slug");
  const [guide, loading] = useLivingGuide();
  const slug = params?.slug ? decodeURIComponent(params.slug) : "";
  const found = guide.items.find((entry) => entry.slug === slug) || guide.items.find((entry) => entry.id === slug) || null;
  // Solo se publica si pertenece a una categoría de la guía.
  const category = found ? livingCategoryOf(guide, found) : null;
  const item = found && category ? found : null;

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useEffect(() => { if (item) document.title = `${item.name} · LIGHT Living`; }, [item?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return <div className="site-shell living-page living-guide">
    <LivingHeader />
    <main className="lgd-missing">{loading ? <p className="lg-meta">Cargando…</p> : <><p className="eyebrow">LIGHT Living</p><h1>Este lugar ya no está en la guía.</h1><Link className="lg-link" href="/living">Volver a The Guide <ArrowUpRight size={14} /></Link></>}</main>
    <SiteFooter />
  </div>;

  return <div className="site-shell living-page living-guide lgd">
    <LivingHeader />
    <LivingItemView guide={guide} item={item} category={category!} />
    <SiteFooter />
  </div>;
}
