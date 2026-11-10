import ArticleEngagement from "@/components/ArticleEngagement";
import FacebrowserLink from "@/components/FacebrowserLink";
import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import { ArrowLeft, ArrowUpRight, ChevronRight, Mail, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import SiteSearch from "@/components/SiteSearch";
import EditorialAccessLink from "@/components/EditorialAccessLink";

const hero = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=90";
const detail = "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=90";
const menuItems = ["Inicio", "Moda", "Belleza", "Eventos", "Sociedad", "Runway", "La revista", "Archivo", "Newsletter"];

export default function ArticlePage() {
  const [heroImageWide, setHeroImageWide] = useState<boolean | null>(null);
  const [heroImageVertical, setHeroImageVertical] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const hrefForMenuItem = (item: string) => item === "Inicio" ? "/" : item === "La revista" ? "/sobre-moda" : item === "Archivo" ? "/archivo" : item === "Newsletter" ? "/newsletter" : `/${item.toLowerCase()}`;

  return <div className="site-shell article-page">
    <header className="site-header">
      <div className="topline"><button className="header-action header-action--menu" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button><p>Antes de que esté de moda, está en LIGHT</p><span className="topline__actions"><EditorialAccessLink /><button className="header-action" type="button" aria-label="Buscar" onClick={() => setSearchOpen(true)}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span></div>
      <div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div>
      <nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav>
    </header>
    {menuOpen && <SiteMenuOverlay onClose={() => setMenuOpen(false)} />}
    {searchOpen && <SiteSearch onClose={() => setSearchOpen(false)} />}

    <main><div className="public-article-breadcrumb article-page__breadcrumb"><Link href="/archivo"><ArrowLeft size={14} /> Archivo</Link><span>LIGHT / PORTADA</span></div><section className={`article-hero${heroImageWide ? " article-hero--wide" : ""}${heroImageVertical ? " article-hero--vertical" : ""}`}><div><p className="eyebrow">Moda / Portada</p><h1>Vestirse<br /><em>de futuro.</em></h1><p className="article-dek">Las prendas ya no siguen una sola dirección. Un armario más libre mezcla memoria, tecnología y una nueva idea de lo que significa estar bien vestido.</p><div className="article-meta"><span>Por Inés Valdés</span><span>12 min de lectura</span><span>06.10.2026</span></div></div><img src={hero} alt="Editorial de moda con prendas contemporáneas" onLoad={(event) => { const image = event.currentTarget; const ratio = image.naturalWidth / image.naturalHeight; setHeroImageWide(ratio > 4 / 3); setHeroImageVertical(ratio < 3 / 4); }} /></section><section className="article-body"><p className="article-lead">El futuro no llega con una silueta única. Llega en capas, en decisiones pequeñas, en la libertad de usar lo que ya existe de una manera distinta.</p><div className="article-columns"><div><p>Durante años, la moda habló de temporadas como si fueran fronteras. Hoy, las fronteras se han vuelto porosas. Una chaqueta heredada convive con una fibra inteligente; un zapato de archivo se mueve por la ciudad con la misma naturalidad que una pieza recién salida del estudio.</p><p>Lo nuevo no es olvidar el pasado, sino aprender a editarlo. La elegancia aparece en esa tensión: una prenda que guarda memoria y, al mismo tiempo, abre una posibilidad.</p></div><div><img src={detail} alt="Silueta de moda en un editorial" /><span>La forma de lo nuevo / Estudio LIGHT</span></div></div><blockquote>“La elegancia no es una respuesta: es una forma de hacer preguntas.”</blockquote><div className="article-end"><ArticleEngagement articleKey="legacy:vestirse-de-futuro" /><a href="/business#colaboraciones"><Mail size={15} /></a><Link href="/archivo">Más historias <ArrowUpRight size={15} /></Link></div></section></main>

    <footer className="site-footer"><div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">LIGHT</Link><p>Una revista sobre lo que nos mueve.</p></div><div className="site-footer__columns"><div><p className="footer-heading">Explora</p><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link></div><div><p className="footer-heading">La revista</p><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/masthead">Masthead</Link><Link href="/business">Business</Link><Link href="/about">About Us</Link><Link href="/business#colaboraciones">Colaboraciones</Link></div><div><p className="footer-heading">Síguenos</p><FacebrowserLink /><Link href="/business#colaboraciones"><Mail size={15} /> Correo</Link></div><div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© LIGHT 2026</span></div></div><div className="site-footer__bottom"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/cookies">Cookies</Link><span className="footer-bottom__right">San Andreas, United States</span></div></footer>
  </div>;
}
