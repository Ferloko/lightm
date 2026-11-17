import { usePageBanner } from "@/lib/pageBanners";
import HeroText from "@/components/HeroText";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SiteFooter } from "@/components/EditorialPageLayout";
import LivingHeader from "@/components/LivingHeader";
import { GuideImage, LivingCover, LivingRank, LivingReview } from "@/components/LivingCards";
import { arrangeLivingGuide, livingAnchor, useLivingGuide } from "@/lib/living";
import { fetchPublishedArticleSummaries, type EditorialArticle } from "@/lib/editorial";

/* LIGHT Living — The Guide: los mejores lugares de la ciudad, por categorías que el equipo crea
   en Dashboard → Living (site_settings: public:living-guide). Los artículos de la categoría Living
   salen aparte, en “Historias de Living”: no se mezclan con la guía. */

export default function LivingPage() {
  const banner = usePageBanner("living");
  const [filter, setFilter] = useState("todo");
  const [guide] = useLivingGuide();
  const sections = arrangeLivingGuide(guide);
  const [stories, setStories] = useState<EditorialArticle[]>([]);
  useEffect(() => { let active = true; void fetchPublishedArticleSummaries().then((items) => { if (active) setStories(items.filter((article) => article.category === "Living")); }); return () => { active = false; }; }, []);
  // Al volver desde una hoja (/living#cat-restaurantes), baja a su sección.
  useEffect(() => { const id = window.location.hash.slice(1); if (!id) return; const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 120); return () => window.clearTimeout(timer); }, []);
  // Si se borra la categoría filtrada, vuelve a “Todo”.
  useEffect(() => { if (filter !== "todo" && filter !== "historias" && !sections.some((section) => section.category.id === filter)) setFilter("todo"); }, [filter, sections]);
  const show = (id: string) => filter === "todo" || filter === id;
  const hasDetailed = sections.some((section) => section.category.format === "resort");
  const names = sections.map((section) => section.category.label.toLowerCase());
  const dek = names.length ? `${names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}` : names[0]} seleccionados y puntuados por el equipo de LIGHT.` : "Lugares seleccionados y puntuados por el equipo de LIGHT.";

  return <div className="site-shell living-page living-guide">
    <LivingHeader />
    <main>
      <section className="lg-hero">
        <div className="lg-hero__media" data-edit-field="image"><GuideImage src={banner.image} position={banner.position} alt="LIGHT Living, la guía de la ciudad" /></div>
        <div className="lg-hero__copy">
          <p className="lg-hero__kicker" data-edit-field="kicker">{banner.kicker}</p>
          <h1 data-edit-field="title"><HeroText value={banner.title} /></h1>
          <p className="lg-hero__dek" data-edit-field="dek">{banner.dek || `${dek.charAt(0).toUpperCase() + dek.slice(1)} Pocos lugares, elegidos con calma.`}</p>
          {sections.length > 0 && <div className="lg-hero__index">{sections.map((section, index) => <a href={`#${livingAnchor(section.category)}`} key={section.category.id}><span>{String(index + 1).padStart(2, "0")}</span> {section.category.label}</a>)}</div>}
        </div>
      </section>

      {(sections.length > 1 || stories.length > 0) && <nav className="lg-filter" aria-label="Filtrar la guía">
        <span>La guía</span>
        {[["todo", "Todo"], ...sections.map((section) => [section.category.id, section.category.label]), ...(stories.length ? [["historias", "Historias"]] : [])].map(([id, label]) => <button type="button" key={id} className={filter === id ? "is-active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
      </nav>}

      {sections.map((section, index) => show(section.category.id) && <section className={`lg-section${section.category.format === "mesa" ? " lg-section--tables" : ""}`} id={livingAnchor(section.category)} key={section.category.id}>
        <header className="lg-section__head"><p className="eyebrow">{String(index + 1).padStart(2, "0")} / {section.category.label}</p><h2>{section.category.title || section.category.label}</h2><span>{section.category.format === "mesa" ? "Ranking LIGHT" : `${section.count} ${section.count === 1 ? "lugar reseñado" : "lugares reseñados"}`}</span></header>
        {section.category.format === "mesa"
          ? <ol className="lg-ranking">{section.items.map((item, position) => <LivingRank item={item} position={position + 1} detailLabel={section.category.detailLabel} key={item.id} />)}</ol>
          : <>{section.cover && <LivingCover item={section.cover} detailLabel={section.category.detailLabel} />}{section.items.length > 0 && <div className="lg-grid">{section.items.map((item) => <LivingReview item={item} detailLabel={section.category.detailLabel} key={item.id} />)}</div>}</>}
      </section>)}

      {sections.length === 0 && <section className="lg-section"><header className="lg-section__head"><p className="eyebrow">The Guide</p><h2>La guía se está <em>preparando.</em></h2></header></section>}

      {stories.length > 0 && show("historias") && <section className="lg-section lgd-more" id="historias">
        <header className="lg-section__head"><p className="eyebrow">Historias de Living</p><h2>Para leer <em>con calma.</em></h2><Link className="lg-link" href="/archivo">Todo el archivo <ArrowUpRight size={14} /></Link></header>
        <div className="lgd-more__grid">{stories.map((article) => <Link className="lgd-mini" href={`/historias/${article.slug || article.id}`} key={article.id}>
          <span className="lgd-mini__media"><GuideImage src={article.image} alt="" /></span>
          <span className="lg-meta">{[article.author && `Por ${article.author}`, article.readingTime].filter(Boolean).join(" · ")}</span>
          <strong>{article.title}</strong>
          <span className="lgd-mini__foot"><span className="lg-meta">{article.excerpt}</span><ArrowUpRight size={16} strokeWidth={1.4} /></span>
        </Link>)}</div>
      </section>}

      {hasDetailed && <section className="lg-method">
        <div><p className="eyebrow">Cómo puntuamos</p><h2>Cinco marcas, <em>cuatro preguntas.</em></h2></div>
        <ol>{[["Servicio", "¿Te anticipan sin invadirte?"], ["Diseño", "¿El espacio tiene una idea, o solo decoración?"], ["Experiencia", "¿Recordarás algo concreto dentro de un año?"], ["Valor", "¿Lo que pagas corresponde a lo que vives?"]].map(([title, question], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong><p>{question}</p></li>)}</ol>
        <p className="lg-method__note">Cada criterio se puntúa de 1 a 5 y la nota final es su media. Una puntuación de 4,5 o más es una recomendación sin reservas.</p>
      </section>}
    </main>
    <SiteFooter />
  </div>;
}
