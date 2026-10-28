import { ArrowLeft, ArrowUpRight, ChevronRight, Instagram, Mail, Menu, Search, X, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useRoute } from "wouter";
import SiteSearch from "@/components/SiteSearch";
import { fetchRemoteArticles, type EditorialArticle } from "@/lib/editorial";
import type { PageBlock } from "@/lib/pageBlocks";

const menuItems = ["Inicio", "Moda", "Belleza", "Cultura", "Sociedad", "Runway", "La revista", "Archivo", "Newsletter"];

export default function DynamicArticlePage() {
  const [, params] = useRoute<{ slug: string }>("/historias/:slug");
  const [article, setArticle] = useState<EditorialArticle | null>(null);
  const [heroImageWide, setHeroImageWide] = useState<boolean | null>(null);
  const [heroImageVertical, setHeroImageVertical] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => { fetchRemoteArticles().then((articles) => setArticle(articles.find((item) => item.status === "published" && (item.slug === params?.slug || item.id === params?.slug)) || null)); }, [params?.slug]);
  if (!article) return <div className="dynamic-article-empty"><p className="eyebrow">LIGHT / Página</p><h1>Esta historia todavía no existe.</h1><Link href="/" className="story-link">Volver a la revista <ArrowUpRight size={15} /></Link></div>;

  const blocks = article.blocks || [];
  const hrefForMenuItem = (item: string) => item === "Inicio" ? "/" : item === "La revista" ? "/sobre-moda" : item === "Archivo" ? "/archivo" : item === "Newsletter" ? "/newsletter" : `/${item.toLowerCase()}`;

  return <div className="site-shell dynamic-article">
    <header className="site-header">
      <div className="topline">
        <button className="header-action header-action--menu" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button>
        <p>La conversación de estilo, sin concesiones.</p>
        <button className="header-action" type="button" aria-label="Buscar" onClick={() => setSearchOpen(true)}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button>
      </div>
      <div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div>
      <nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/cultura">Cultura</Link><Link href="/sociedad">Sociedad</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav>
    </header>

    {menuOpen && <div className="menu-overlay" role="dialog" aria-modal="true" aria-label="Menú de navegación"><div className="menu-overlay__top"><span className="menu-overlay__edition">LIGHT</span><button className="close-button" type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={22} strokeWidth={1.3} /></button></div><div className="menu-overlay__inner"><p className="eyebrow">Explora la revista</p><div className="menu-overlay__links">{menuItems.map((item, index) => <Link href={hrefForMenuItem(item)} key={item} onClick={() => setMenuOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span>{item}<ArrowUpRight size={22} strokeWidth={1.2} /></Link>)}</div><p className="menu-overlay__note">Historias para mirar más de cerca.</p></div></div>}
    {searchOpen && <SiteSearch onClose={() => setSearchOpen(false)} />}

    <main className="public-article-paper"><div className="public-article-breadcrumb"><Link href="/archivo"><ArrowLeft size={14} /> Archivo</Link><span>LIGHT / {article.category}</span></div><div className={`public-article-hero-split${heroImageWide ? " public-article-hero-split--wide" : ""}${heroImageVertical ? " public-article-hero-split--vertical" : ""}`}><div className="dynamic-article__intro"><p className="eyebrow">{article.eyebrow || `${article.category} / Historia`}</p><h1>{article.title}</h1><p>{article.excerpt}</p><div className="dynamic-article__meta"><span>Por {article.author}</span><span>{article.readingTime || "8 min de lectura"}</span><span>{article.date || new Date(article.updatedAt).toLocaleDateString("es-ES")}</span></div></div>{article.image && <figure className="public-hero-figure"><img src={article.image} alt={article.title} onLoad={(event) => { const image = event.currentTarget; const ratio = image.naturalWidth / image.naturalHeight; setHeroImageWide(ratio > 4 / 3); setHeroImageVertical(ratio < 3 / 4); }} /><figcaption>{article.imageCaption}</figcaption></figure>}</div>{article.lead && <p className="public-lead">{article.lead}</p>}<div className="public-article-blocks">{blocks.filter((block) => !blocks.some((grid) => grid.type === "grid" && grid.gridColumns && [...grid.gridColumns.left, ...grid.gridColumns.right].includes(block.id))).map((block) => <PublicBlock key={block.id} block={block} blocks={blocks} />)}</div><div className="public-article-end"><span>Compartir historia</span><Link href="/archivo">Más historias <ArrowUpRight size={15} /></Link></div></main>

    <footer className="site-footer"><div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">LIGHT</Link><p>Una revista sobre lo que nos mueve.</p></div><div className="site-footer__columns"><div><p className="footer-heading">Explora</p><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/cultura">Cultura</Link><Link href="/sociedad">Sociedad</Link></div><div><p className="footer-heading">La revista</p><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/sobre-moda">Sobre LIGHT</Link><Link href="/contacto">Contacto</Link></div><div><p className="footer-heading">Síguenos</p><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> Instagram</a><a href="https://youtube.com" target="_blank" rel="noreferrer"><Youtube size={15} /> YouTube</a><Link href="/contacto"><Mail size={15} /> Correo</Link></div><div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© LIGHT 2026</span></div></div><div className="site-footer__bottom"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/cookies">Cookies</Link><span className="footer-bottom__right">Madrid · Ciudad de México · Buenos Aires</span></div></footer>
  </div>;
}

function PublicBlock({ block, blocks = [] }: { block: PageBlock; blocks?: PageBlock[] }) {
  if (block.type === "grid") { const split = Math.min(78, Math.max(22, block.gridSplit || (block.gridLayout === "left" ? 58 : 42))); return <section className={`public-grid public-grid--${block.gridLayout || "left"}`} style={{ "--grid-split": `${split}%` } as CSSProperties}><div className="public-grid__cell public-grid__cell--left">{(block.gridColumns?.left || []).map((id) => { const item = blocks.find((candidate) => candidate.id === id); return item ? <PublicBlock block={item} blocks={blocks} key={id} /> : null; })}</div><div className="public-grid__cell public-grid__cell--right">{(block.gridColumns?.right || []).map((id) => { const item = blocks.find((candidate) => candidate.id === id); return item ? <PublicBlock block={item} blocks={blocks} key={id} /> : null; })}</div></section>; }
  if (block.type === "image") return <figure className={`public-block public-block--image public-block--image-${block.imageAlign || "full"}`}>{block.content && <img src={block.content} alt="" />}<figcaption>{block.caption}</figcaption></figure>;
  if (block.type === "divider") return <div className="public-block public-block--divider"><hr /></div>;
  if (block.type === "button") return <div className="public-block public-block--button">{block.content}</div>;
  if (block.type === "quote") return <blockquote className="public-block public-block--quote">“{block.content}”</blockquote>;
  if (block.type === "heading") return <h2 className="public-block public-block--heading">{block.content}</h2>;
  return <p className="public-block public-block--paragraph">{block.content}</p>;
}
