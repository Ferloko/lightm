import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import EditorialAccessLink from "@/components/EditorialAccessLink";
import { Menu, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

/** Cabecera de Living (la guía y cada hoja), con el menú lateral. */
export default function LivingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <>
    <header className="site-header"><div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button><p>Antes de que esté de moda, está en LIGHT</p><span className="topline__actions"><EditorialAccessLink /><button className="header-action" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span></div><div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div><nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link className="nav-active" href="/living">Living</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav></header>
    {menuOpen && <SiteMenuOverlay onClose={() => setMenuOpen(false)} />}
  </>;
}
