import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, MapPin, Plus, Trash2 } from "lucide-react";
import { ImageUrlFrame, InlineText } from "@/components/InlineEditing";
import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { SiteFooter } from "@/components/EditorialPageLayout";
import LivingHeader from "@/components/LivingHeader";
import { fmtScore, GuideImage, livingMeta, Price, Rating } from "@/components/LivingCards";
import { arrangeLivingGuide, livingAnchor, livingBlocks, livingCategoryOf, livingCriteria, livingHref, livingScoreOf, useLivingGuide, type LivingBlock, type LivingCategory, type LivingGuide, type LivingItem, type LivingPrice } from "@/lib/living";
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

/** Lo que necesita la hoja para editarse en su sitio (Dashboard → Living). */
export type LivingEdit = {
  update: (patch: Partial<LivingItem>) => void;
  blocks: LivingBlock[];
  setBlocks: (blocks: LivingBlock[]) => void;
  focusIndex?: number | null;
};

const blockNames: Record<LivingBlock["type"], string> = { text: "Párrafo", heading: "Subtítulo", quote: "Cita", image: "Imagen" };

/** La reseña como bloques editables: cada uno con subir, bajar y quitar (como el editor de artículos). */
function ReviewBlocks({ edit, name }: { edit: LivingEdit; name: string }) {
  const { blocks, setBlocks } = edit;
  const change = (index: number, block: LivingBlock) => setBlocks(blocks.map((item, itemIndex) => itemIndex === index ? block : item));
  const move = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= blocks.length) return; const next = [...blocks]; [next[index], next[target]] = [next[target], next[index]]; setBlocks(next); };
  const remove = (index: number) => { const block = blocks[index]; const filled = block.type === "image" ? block.src.trim() : block.text.trim(); if (filled && !window.confirm(`¿Quitar este bloque (${blockNames[block.type].toLowerCase()})?`)) return; setBlocks(blocks.filter((_, itemIndex) => itemIndex !== index)); };
  if (!blocks.length) return <div className="lgd-edit-empty">La reseña está vacía: la hoja mostrará el veredicto. Añade un párrafo o una imagen con los botones de “Añadir a la reseña”.</div>;
  return <>{blocks.map((block, index) => <div className={`lgd-edit-block lgd-edit-block--${block.type}`} key={index} data-block-index={index}>
    <div className="lgd-edit-block__tools"><span>{blockNames[block.type]}</span><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir"><ArrowUp size={13} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === blocks.length - 1} aria-label="Bajar"><ArrowDown size={13} /></button><button type="button" onClick={() => remove(index)} aria-label="Quitar"><Trash2 size={13} /></button></div>
    {block.type === "image" ? <figure className="lgd-article__figure"><ImageUrlFrame className="lgd-edit-image" src={block.src} onChange={(src) => change(index, { ...block, src })} emptyLabel="Haz clic para pegar la URL de la imagen" /><figcaption><InlineText value={block.caption} onChange={(caption) => change(index, { ...block, caption })} placeholder="Pie de foto (opcional)" ariaLabel="Pie de foto" /></figcaption></figure>
      : block.type === "heading" ? <h3 className="lgd-article__subtitle"><InlineText multiline value={block.text} onChange={(text) => change(index, { ...block, text })} placeholder="Un subtítulo" ariaLabel="Subtítulo" /></h3>
      : block.type === "quote" ? <blockquote className="lgd-article__quote"><InlineText multiline value={block.text} onChange={(text) => change(index, { ...block, text })} placeholder="Una frase que merece espacio" ariaLabel="Cita" /></blockquote>
      : <p><InlineText multiline value={block.text} onChange={(text) => change(index, { ...block, text })} placeholder={index === 0 ? `Cuenta la experiencia en ${name || "este lugar"}…` : "Sigue escribiendo…"} ariaLabel="Párrafo" /></p>}
  </div>)}</>;
}

/** El contenido de la hoja (sin cabecera ni pie): lo usan la página pública y, con `edit`, el editor del Dashboard. */
export function LivingItemView({ guide, item, category: cat, edit }: { guide: LivingGuide; item: LivingItem; category: LivingCategory; edit?: LivingEdit }) {
  const section = arrangeLivingGuide(guide).find((entry) => entry.category.id === cat.id);
  const detailed = cat.format === "resort";
  const rank = !detailed && section ? section.items.findIndex((entry) => entry.id === item.id) + 1 : 0;
  const isPick = detailed && section?.cover?.id === item.id;
  const blocks = livingBlocks(item.body);
  const more = guide.items.filter((entry) => entry.categoryId === item.categoryId && entry.id !== item.id).slice(0, 3);
  const up = edit?.update;
  /** Un texto de la ficha: en el editor se escribe encima. */
  const field = (key: "name" | "category" | "place" | "verdict" | "location" | "idealFor" | "signature", placeholder: string, multiline = false) => up ? <InlineText multiline={multiline} value={item[key]} onChange={(value) => up({ [key]: value })} placeholder={placeholder} ariaLabel={placeholder} /> : item[key];
  const price = up ? <span className="lgd-edit-price" role="radiogroup" aria-label="Precio">{([1, 2, 3, 4] as LivingPrice[]).map((level) => <button type="button" role="radio" aria-checked={item.price === level} className={item.price === level ? "is-active" : ""} key={level} onClick={() => up({ price: level })}>{"$".repeat(level)}</button>)}</span> : <Price level={item.price} />;
  const detailKey = detailed ? "idealFor" : "signature";
  const facts: [string, React.ReactNode, boolean][] = [["Tipo", field("category", "Resort & Spa, italiana…"), Boolean(item.category)], ["Zona", field("place", "Puerto Viejo"), Boolean(item.place)], [cat.detailLabel, field(detailKey, detailed ? "Escapadas en pareja" : "El plato o servicio estrella"), Boolean(item[detailKey])], ...(!detailed ? [["Ranking LIGHT", rank ? `N.º ${rank}` : "", Boolean(rank)] as [string, React.ReactNode, boolean]] : []), ["Precio", price, true]];
  const gallery = item.gallery.filter((src) => src.trim());
  const score = (value: number, onChange: (value: number) => void, label: string) => <input className="lgd-edit-score" type="number" min={0} max={5} step={0.1} value={value} onChange={(event) => onChange(Math.round(Math.max(0, Math.min(5, Number(event.target.value) || 0)) * 10) / 10)} aria-label={label} />;

  return <main>
      <section className="lgd-hero">
        <div className="lgd-hero__media">
          {up ? <ImageUrlFrame className="lgd-edit-cover" src={item.image} onChange={(image) => up({ image })} emptyLabel="Haz clic para añadir la imagen principal (horizontal, 5:4)" /> : <GuideImage src={item.image} alt={item.name} />}
          {isPick ? <span className="lg-badge">LIGHT Pick · N.º 1</span> : rank ? <span className="lg-badge">Ranking LIGHT · N.º {rank}</span> : null}
        </div>
        <div className="lgd-hero__copy">
          <Link className="lgd-back" href={`/living#${livingAnchor(cat)}`}><ArrowLeft size={14} /> The Guide · {cat.label}</Link>
          <p className="lg-meta">{up ? <>{cat.singular} · {field("category", "Tipo")} · {field("place", "Zona")}</> : livingMeta(cat.singular, item.category, item.place)}</p>
          <h1>{up ? <InlineText multiline value={item.name} onChange={(name) => up({ name })} placeholder="Nombre del lugar" ariaLabel="Nombre" /> : item.name}</h1>
          <Rating value={livingScoreOf(item)} size="lg" />
          {(item.verdict || up) && <blockquote>{up ? <InlineText multiline value={item.verdict} onChange={(verdict) => up({ verdict })} placeholder="El veredicto LIGHT: qué hace especial a este lugar, en una o dos frases." ariaLabel="Veredicto" /> : `“${item.verdict}”`}</blockquote>}
          {(item.location || up) && <p className="lgd-location"><MapPin size={14} strokeWidth={1.5} /> {field("location", "Dirección o ubicación")}</p>}
        </div>
      </section>

      <section className="lgd-body">
        <article className="lgd-article">
          <p className="eyebrow">La reseña LIGHT</p>
          {edit ? <ReviewBlocks edit={edit} name={item.name} /> : blocks.length ? blocks.map((block, index) => block.type === "text" ? <p key={index}>{block.text}</p> : block.type === "heading" ? <h3 className="lgd-article__subtitle" key={index}>{block.text}</h3> : block.type === "quote" ? <blockquote className="lgd-article__quote" key={index}>{block.text}</blockquote> : safeImageUrl(block.src) ? <figure className="lgd-article__figure" key={index}><GuideImage src={safeImageUrl(block.src)} alt={block.caption || `${item.name}, imagen de la reseña`} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure> : null) : <p>{item.verdict || "La reseña completa llegará pronto."}</p>}
        </article>
        <aside className="lgd-aside">
          <div className="lgd-score">
            <p className="eyebrow">La nota LIGHT</p>
            <Rating value={livingScoreOf(item)} size="lg" />
            {detailed && <dl className="lg-scores">{livingCriteria.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><span><i style={{ width: `${(item.scores[key] / 5) * 100}%` }} /></span>{up ? score(item.scores[key], (value) => up({ scores: { ...item.scores, [key]: value } }), label) : <b>{fmtScore(item.scores[key])}</b>}</dd></div>)}</dl>}
            {!detailed && up && <label className="lgd-edit-overall">Nota (0 a 5) {score(item.score, (value) => up({ score: value }), "Nota LIGHT")}</label>}
            <small>{livingScoreOf(item) >= 4.5 ? "Recomendación sin reservas." : "Cada criterio se puntúa de 1 a 5; la nota final es su media."}</small>
          </div>
          <dl className="lgd-facts">{facts.filter(([, , shown]) => shown || up).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}{(item.location || up) && <div><dt>Ubicación</dt><dd>{field("location", "Dirección")}</dd></div>}</dl>
        </aside>
      </section>

      {(gallery.length > 0 || up) && <section className={`lgd-gallery${up ? " lgd-gallery--edit" : ""}`} aria-label="Galería">
        {(up ? item.gallery : gallery).map((src, index) => <figure key={`${index}`} className={!up && index === 0 && gallery.length % 2 === 1 ? "is-wide" : ""}>{up ? <><ImageUrlFrame className="lgd-edit-gallery" src={src} onChange={(url) => up({ gallery: item.gallery.map((entry, entryIndex) => entryIndex === index ? url : entry) })} emptyLabel="Pega la URL de la imagen" /><button type="button" className="lgd-edit-remove" onClick={() => up({ gallery: item.gallery.filter((_, entryIndex) => entryIndex !== index) })} aria-label="Quitar de la galería"><Trash2 size={13} /></button></> : <GuideImage src={src} alt={`${item.name}, imagen ${index + 1}`} />}</figure>)}
        {up && <button type="button" className="lgd-edit-add" onClick={() => up({ gallery: [...item.gallery, ""] })}><Plus size={18} /> Añadir a la galería</button>}
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
