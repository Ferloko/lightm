import ArticleEngagement from "@/components/ArticleEngagement";
import FollowLinks from "@/components/FollowLinks";
import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import { ArrowLeft, ArrowUpRight, ChevronRight, Mail, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useRoute } from "wouter";
import SiteSearch from "@/components/SiteSearch";
import { fetchPublishedArticle, type EditorialArticle } from "@/lib/editorial";
import type { PageBlock } from "@/lib/pageBlocks";
import { ArticleSkeleton } from "@/components/EditorialSkeleton";
import EditorialAccessLink from "@/components/EditorialAccessLink";
import PublicArticleView from "@/components/PublicArticleView";

const menuItems = ["Inicio", "Moda", "Belleza", "Eventos", "Sociedad", "Runway", "La revista", "Archivo", "Newsletter"];

export default function DynamicArticlePage() {
  const [, params] = useRoute<{ slug: string }>("/historias/:slug");
  const [article, setArticle] = useState<EditorialArticle | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const slug = decodeURIComponent(params?.slug || "");
    const load = () => fetchPublishedArticle(slug).then((next) => { if (active) setArticle(next); });
    setLoading(true);
    void load().finally(() => { if (active) setLoading(false); });
    // Re-check when the reader comes back to the tab: a hidden article becomes the 404.
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; document.removeEventListener("visibilitychange", onVisible); };
  }, [params?.slug]);
  useEffect(() => { if (article) document.title = `${article.title} — LIGHT`; return () => { document.title = "LIGHT — Revista de estilo"; }; }, [article]);
  if (loading && !article) return <ArticleSkeleton />;
  if (!article) return <div className="dynamic-article-empty"><p className="eyebrow">LIGHT / Página</p><h1>Esta historia todavía no existe.</h1><Link href="/" className="story-link">Volver a la revista <ArrowUpRight size={15} /></Link></div>;

  const blocks = article.blocks || [];
  const hrefForMenuItem = (item: string) => item === "Inicio" ? "/" : item === "La revista" ? "/sobre-moda" : item === "Archivo" ? "/archivo" : item === "Newsletter" ? "/newsletter" : `/${item.toLowerCase()}`;

  return <div className="site-shell dynamic-article">
    <header className="site-header">
      <div className="topline">
        <button className="header-action header-action--menu" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button>
        <p>Antes de que esté de moda, está en LIGHT</p>
        <span className="topline__actions"><EditorialAccessLink /><button className="header-action" type="button" aria-label="Buscar" onClick={() => setSearchOpen(true)}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span>
      </div>
      <div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div>
      <nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav>
    </header>

    {menuOpen && <SiteMenuOverlay onClose={() => setMenuOpen(false)} />}
    {searchOpen && <SiteSearch onClose={() => setSearchOpen(false)} />}

    <PublicArticleView article={article} />

    <footer className="site-footer"><div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">LIGHT</Link><p>Una revista sobre lo que nos mueve.</p></div><div className="site-footer__columns"><div><p className="footer-heading">Explora</p><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link></div><div><p className="footer-heading">La revista</p><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/masthead">Masthead</Link><Link href="/business">Business</Link><Link href="/about">About Us</Link><Link href="/business#colaboraciones">Colaboraciones</Link></div><div><p className="footer-heading">Síguenos</p><FollowLinks /><Link href="/business#colaboraciones"><Mail size={15} /> Correo</Link></div><div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© LIGHT 2026</span></div></div><div className="site-footer__bottom"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/cookies">Cookies</Link><span className="footer-bottom__right">San Andreas, United States</span></div></footer>
  </div>;
}
