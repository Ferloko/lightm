import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import { usePageBanner } from "@/lib/pageBanners";
import FollowLinks from "@/components/FollowLinks";
import { ArrowUpRight, ChevronRight, Mail, Menu, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRemoteRunwayBrands, getRunwayBrands, runwayEventName, type RunwayBrand } from "@/lib/runway";
import { subscribeToTable } from "@/lib/supabase";
import { Link } from "wouter";
import EditorialAccessLink from "@/components/EditorialAccessLink";
import HeroArt from "@/components/HeroArt";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

export function RunwayFooter() {
  return <footer className="site-footer"><div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">LIGHT</Link><p>Una revista sobre lo que nos mueve.</p></div><div className="site-footer__columns"><div><p className="footer-heading">Explora</p><Link href="/runway">Runway</Link><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link></div><div><p className="footer-heading">La revista</p><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/masthead">Masthead</Link><Link href="/business">Business</Link><Link href="/about">About Us</Link><Link href="/business#colaboraciones">Colaboraciones</Link></div><div><p className="footer-heading">Síguenos</p><FollowLinks /><Link href="/business#colaboraciones"><Mail size={15} /> Correo</Link></div><div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© LIGHT 2026</span></div></div><div className="site-footer__bottom"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/cookies">Cookies</Link><span className="footer-bottom__right">San Andreas, United States</span></div></footer>;
}

export default function RunwayPage() {
  const banner = usePageBanner("runway");
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [brands, setBrands] = useState<RunwayBrand[]>(getRunwayBrands());
  useEffect(() => { const refresh = () => { void fetchRemoteRunwayBrands().then(setBrands); }; refresh(); window.addEventListener(runwayEventName, refresh); const unsubscribe = subscribeToTable("runway_brands", refresh); return () => { window.removeEventListener(runwayEventName, refresh); unsubscribe(); }; }, []);
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const filteredBrands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return brands.filter((item) => (!letter || item.brand.toUpperCase().startsWith(letter)) && (!normalized || item.brand.toLowerCase().includes(normalized) || item.city.toLowerCase().includes(normalized)));
  }, [brands, letter, query]);
  const brandDirectory = brands.map((item) => item.brand);
  const hasFilter = Boolean(query.trim() || letter);
  const clearFilters = () => { setQuery(""); setLetter(null); };
  const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return <div className="site-shell runway-page"><header className="site-header"><div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button><p>Antes de que esté de moda, está en LIGHT</p><span className="topline__actions"><EditorialAccessLink /><button className="header-action runway-toplink" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span></div><div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div><nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link><Link className="nav-active" href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav></header>{menuOpen && <SiteMenuOverlay onClose={closeMenu} />}<main><section className="runway-heading runway-heading--art"><HeroArt className="hero-art--backdrop" src={banner.image} position={banner.position} /><p className="eyebrow">Highlights</p><h1>Spring 2027 Ready-to-Wear</h1><p>La temporada vista desde la pasarela: firmas, siluetas y momentos que definen lo que viene.</p></section><section className="runway-browser"><aside className="runway-sidebar"><label className="runway-search"><Search size={20} strokeWidth={1.5} /><input aria-label="Buscar marca" value={query} onChange={(event) => { setQuery(event.target.value); setLetter(null); }} placeholder="Buscar marca" /></label><div className="runway-directory"><div className="runway-directory__head"><span>Marcas</span><span>{brandDirectory.length}</span></div><div className="runway-directory__scroll">{brandDirectory.map((brand) => <button type="button" key={brand} onClick={() => { setQuery(brand); setLetter(null); }}>{brand}</button>)}</div></div><div className="runway-alphabet" aria-label="Filtrar por letra">{alphabet.map((item) => <button type="button" className={letter === item ? "is-active" : ""} key={item} onClick={() => { setLetter(item); setQuery(""); }}>{item}</button>)}</div><button type="button" className={`runway-clear ${hasFilter ? "runway-clear--visible" : ""}`} onClick={clearFilters}>× Ver todas las marcas</button></aside><div className="runway-results"><div className="runway-results__top"><span>Spring 2027 / Ready-to-Wear</span><span>{filteredBrands.length} marcas</span></div><div className="runway-grid">{filteredBrands.map((item, index) => <article className="runway-card" key={item.brand}><Link href={`/runway/${slugify(item.brand)}`}><div className="runway-card__image"><img src={item.image} alt={`Desfile de ${item.brand}`} /><span>{String(index + 1).padStart(2, "0")}</span></div><div className="runway-card__meta"><h2>{item.brand}</h2><span>{item.city}</span></div></Link></article>)}</div>{filteredBrands.length === 0 && <div className="runway-empty">No encontramos esa marca. <button type="button" onClick={clearFilters}>Limpiar filtros</button></div>}</div></section></main><RunwayFooter /></div>;
}
