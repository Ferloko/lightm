import { ArrowUpRight, Search, Mail } from "lucide-react";
import FollowLinks from "@/components/FollowLinks";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { fetchPublishedArticleSummaries, type EditorialArticle } from "@/lib/editorial";
import { useArchivePlacements } from "@/lib/archivePlacements";
import { subscribeToTable } from "@/lib/supabase";
import EditorialAccessLink from "@/components/EditorialAccessLink";

const categories = ["Todo", "Moda", "Belleza", "Eventos", "Sociedad"];

function localViewsFor(article: EditorialArticle) {
  try {
    const views = JSON.parse(localStorage.getItem("light_page_views") || "[]") as Array<{ path?: string }>;
    return views.filter((view) => view.path === `/historias/${article.slug || article.id}`).length;
  } catch { return 0; }
}

function imageFor(article: EditorialArticle) {
  return article.image || "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=84";
}

function ArticleCard({ article, index, compact = false }: { article: EditorialArticle; index: number; compact?: boolean }) {
  return <article className={`archive-article-card${compact ? " archive-article-card--compact" : ""}`}><Link href={`/historias/${article.slug || article.id}`} className="archive-article-card__image"><img src={imageFor(article)} alt="" /><span>{String(index + 1).padStart(2, "0")}</span><span className="image-hover-overlay"><strong>{article.title || "Sin título"}</strong><small>Leer historia <ArrowUpRight size={14} /></small></span></Link><div className="archive-article-card__body"><p className="eyebrow">{article.category}</p><h3><Link href={`/historias/${article.slug || article.id}`}>{article.title || "Sin título"}</Link></h3>{!compact && article.excerpt && <p>{article.excerpt}</p>}<Link className="archive-article-card__link" href={`/historias/${article.slug || article.id}`}>Leer historia <ArrowUpRight size={14} /></Link></div></article>;
}

function MustReads({ articles }: { articles: EditorialArticle[] }) {
  const lead = articles[0];
  if (!lead) return <section className="archive-mustreads"><div className="archive-empty">Selecciona artículos como Must-Reads desde el Dashboard.</div></section>;
  return <section className="archive-mustreads"><div className="archive-section-heading archive-section-heading--center"><div><p className="eyebrow">LIGHT / Selección editorial</p><h2>MUST-READS</h2></div></div><div className="archive-mustreads__layout"><article className="archive-mustreads__lead"><Link href={`/historias/${lead.slug || lead.id}`}><img src={imageFor(lead)} alt="" /></Link><div><p className="eyebrow">{lead.category} · {lead.date || "LIGHT"}</p><h3><Link href={`/historias/${lead.slug || lead.id}`}>{lead.title}</Link></h3><p>{lead.excerpt || lead.lead}</p><small>by {lead.author || "LIGHT"}</small></div></article><div className="archive-mustreads__list">{articles.slice(1, 5).map((article, index) => <article className="archive-mustread-row" key={article.id}><Link href={`/historias/${article.slug || article.id}`}><img src={imageFor(article)} alt="" /></Link><div><p className="eyebrow">{article.category} <span>{article.date}</span></p><h3><Link href={`/historias/${article.slug || article.id}`}>{article.title}</Link></h3><small>by {article.author || "LIGHT"}</small></div><span className="archive-mustread-row__number">0{index + 2}</span></article>)}</div></div></section>;
}

function Footer() {
  return <footer className="site-footer"><div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">LIGHT</Link><p>Una revista sobre lo que nos mueve.</p></div><div className="site-footer__columns"><div><p className="footer-heading">Explora</p><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link></div><div><p className="footer-heading">La revista</p><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/masthead">Masthead</Link><Link href="/business">Business</Link><Link href="/about">About Us</Link><Link href="/business#colaboraciones">Colaboraciones</Link></div><div><p className="footer-heading">Síguenos</p><FollowLinks /><Link href="/business#colaboraciones"><Mail size={15} /> Correo</Link></div><div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© LIGHT 2026</span></div></div><div className="site-footer__bottom"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/cookies">Cookies</Link><span className="footer-bottom__right">San Andreas, United States</span></div></footer>;
}

export default function ArchivePage() {
  const [articles, setArticles] = useState<EditorialArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todo");

  useEffect(() => {
    let active = true;
    const refresh = () => { void fetchPublishedArticleSummaries().then((visible) => { if (active) setArticles(visible); }).finally(() => { if (active) setArticlesLoading(false); }); };
    refresh();
    const unsubscribe = subscribeToTable("articles", refresh);
    return () => { active = false; unsubscribe(); };
  }, []);

  const [placements] = useArchivePlacements();
  const recent = useMemo(() => [...articles].sort((a, b) => (b.date || b.updatedAt).localeCompare(a.date || a.updatedAt)), [articles]);
  const popular = useMemo(() => [...articles].sort((a, b) => Number(placements[b.id]?.mustRead) - Number(placements[a.id]?.mustRead) || localViewsFor(b) - localViewsFor(a) || Number(b.isFeatured) - Number(a.isFeatured) || (b.date || "").localeCompare(a.date || "")), [articles, placements]);
  const hasExplicitSpotlight = Object.values(placements).some((placement) => placement.spotlight);
  const hasExplicitMustReads = Object.values(placements).some((placement) => placement.mustRead);
  const spotlight = (hasExplicitSpotlight ? articles.find((article) => placements[article.id]?.spotlight) : recent.find((article) => article.isFeatured)) || recent[0];
  const mustReads = (hasExplicitMustReads ? articles.filter((article) => placements[article.id]?.mustRead).sort((a, b) => (placements[a.id]?.order ?? 99) - (placements[b.id]?.order ?? 99)) : popular.filter((article) => article.isFeatured)).slice(0, 5);
  const categoryArticles = selectedCategory === "Todo" ? recent : recent.filter((article) => article.category.toLowerCase() === selectedCategory.toLowerCase());
  const searchResults = useMemo(() => { const term = search.trim().toLowerCase(); if (!term) return []; return articles.filter((article) => [article.title, article.category, article.excerpt, article.lead].some((value) => value.toLowerCase().includes(term))); }, [articles, search]);
  const mastheadImage = "/images/GTA54.webp";

  return <div className="site-shell archive-page"><header className="site-header"><div className="topline"><Link className="header-action" href="/"><span>← Inicio</span></Link><p>Antes de que esté de moda, está en LIGHT</p><span className="topline__actions"><EditorialAccessLink /><button className="header-action" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span></div><div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div><nav className="main-nav"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav></header><main><section className="archive-masthead" style={{ backgroundImage: `linear-gradient(90deg, rgba(29,28,28,.64), rgba(29,28,28,.12)), url(${mastheadImage})` }}><div className="archive-masthead__top"><span>LIGHT / ARCHIVE</span></div><div className="archive-masthead__title"><strong>LIGHT</strong><span>THE COMPLETE ARCHIVE</span></div></section><section className="archive-content" id="latest-issue"><div className="archive-section-heading archive-section-heading--latest"><div><p className="eyebrow">LIGHT / Selección editorial</p><h2>LATEST ISSUE</h2></div><span>{recent.length} historias publicadas</span></div>{articlesLoading ? <div className="archive-latest-grid article-skeleton-grid" aria-label="Cargando historias">{[1, 2, 3, 4, 5, 6].map((item) => <div className="article-skeleton-card" key={item}><div className="article-skeleton-card__image" /><div className="article-skeleton-card__line article-skeleton-card__line--short" /><div className="article-skeleton-card__line" /><div className="article-skeleton-card__line article-skeleton-card__line--medium" /></div>)}</div> : recent.length ? <div className="archive-latest-grid">{recent.slice(0, 6).map((article, index) => <ArticleCard article={article} index={index} key={article.id} />)}</div> : <div className="archive-empty">Las nuevas historias aparecerán aquí cuando se publiquen desde el Dashboard.</div>}<MustReads articles={mustReads} /></section>{spotlight && <section className="archive-spotlight"><div className="archive-spotlight__backdrop" style={{ backgroundImage: `url(${imageFor(spotlight)})` }} /><div className="archive-spotlight__image"><img src={imageFor(spotlight)} alt="" /></div><div className="archive-spotlight__copy"><p className="eyebrow">SPOTLIGHT / {spotlight.category}</p><h2>{spotlight.title}</h2><p>{spotlight.excerpt || spotlight.lead}</p><Link className="archive-spotlight__link" href={`/historias/${spotlight.slug || spotlight.id}`}>Abrir spotlight <ArrowUpRight size={16} /></Link></div></section>}<section className="archive-search"><div><p className="eyebrow">Archivo abierto</p><h2>Busca una historia.</h2></div><label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, tema o palabra clave" /></label>{search && <div className="archive-search__results">{searchResults.length ? searchResults.map((article, index) => <ArticleCard article={article} index={index} compact key={article.id} />) : <p>No encontramos historias con esa búsqueda.</p>}</div>}</section><section className="archive-categories"><div className="archive-section-heading"><div><p className="eyebrow">Archivo por conversación</p><h2>Browse by category.</h2></div></div><div className="archive-category-tabs" role="tablist" aria-label="Categorías del archivo">{categories.map((category) => <button key={category} type="button" className={selectedCategory === category ? "is-active" : ""} onClick={() => setSelectedCategory(category)}>{category}</button>)}</div><section className="archive-category archive-category--selected"><div className="archive-category__heading"><h3>{selectedCategory}</h3><span>{categoryArticles.length} historias</span></div>{categoryArticles.length ? <div className="archive-category__grid">{categoryArticles.map((article, index) => <ArticleCard article={article} index={index} compact key={article.id} />)}</div> : <p className="archive-category__empty">Próximamente en {selectedCategory}.</p>}</section></section></main><Footer /></div>;
}
