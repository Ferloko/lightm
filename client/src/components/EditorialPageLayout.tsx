import { ArrowUpRight, Instagram, Mail, Menu, Search, X, Youtube } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import SiteSearch from "@/components/SiteSearch";

const navigation = [
  ["Moda", "/moda"],
  ["Belleza", "/belleza"],
  ["Eventos", "/eventos"],
  ["Living", "/living"],
  ["Runway", "/runway"],
  ["La revista", "/sobre-moda"],
];

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">LIGHT</Link><p>Una revista sobre lo que nos mueve.</p></div>
    <div className="site-footer__columns">
      <div><p className="footer-heading">Explora</p><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link><Link href="/runway">Runway</Link></div>
      <div><p className="footer-heading">LIGHT</p><Link href="/masthead">Masthead</Link><Link href="/business">Business</Link><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/about">About Us</Link><Link href="/business#colaboraciones">Colaboraciones</Link></div>
      <div><p className="footer-heading">Síguenos</p><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> Instagram</a><a href="https://youtube.com" target="_blank" rel="noreferrer"><Youtube size={15} /> YouTube</a><Link href="/business#colaboraciones"><Mail size={15} /> Correo</Link></div>
      <div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© LIGHT 2026</span></div>
    </div>
    <div className="site-footer__bottom"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/cookies">Cookies</Link><span className="footer-bottom__right">San Andreas, United States</span></div>
  </footer>;
}

export default function EditorialPageLayout({ activePath, children }: { activePath: string; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  return <div className="site-shell editorial-page">
    <header className="site-header">
      <div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={19} /><span>Menú</span></button><p>Antes de que esté de moda, está en LIGHT</p><button className="header-action" type="button" onClick={() => setSearchOpen(true)}><Search size={18} /><span>Buscar</span></button></div>
      <div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div>
      <nav className="main-nav" aria-label="Navegación principal">{navigation.map(([label, href]) => <Link className={activePath === href ? "nav-active" : ""} href={href} key={href}>{label}</Link>)}</nav>
    </header>
    {searchOpen && <SiteSearch onClose={() => setSearchOpen(false)} />}
    {menuOpen && <SiteMenuOverlay onClose={() => setMenuOpen(false)} />}
    <main>{children}</main>
    <SiteFooter />
  </div>;
}
