import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import MenuThemeToggle from "./MenuThemeToggle";

/** Main sections: large editorial links. */
export const siteMenuSections: [string, string][] = [["Inicio", "/"], ["Moda", "/moda"], ["Belleza", "/belleza"], ["Eventos", "/eventos"], ["Living", "/living"], ["Runway", "/runway"], ["La revista", "/sobre-moda"]];
/** The house: smaller links about LIGHT itself. */
export const siteMenuHouse: [string, string][] = [["About Us", "/about"], ["Masthead", "/masthead"], ["Business", "/business"], ["Archivo", "/archivo"], ["Newsletter", "/newsletter"]];
/** Kept for callers that need every destination in one list. */
export const siteMenuLinks: [string, string][] = [...siteMenuSections, ...siteMenuHouse];

/** The three-line menu, identical on every public page. */
export default function SiteMenuOverlay({ onClose, note = "Historias para mirar más de cerca." }: { onClose: () => void; note?: string }) {
  const [location] = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);
  const isCurrent = (href: string) => href === "/" ? location === "/" : location.startsWith(href);
  return <div className="site-menu" role="dialog" aria-modal="true" aria-label="Menú de navegación">
    <div className="site-menu__bar">
      <Link href="/" className="site-menu__brand" onClick={onClose}>LIGHT</Link>
      <div className="site-menu__actions"><MenuThemeToggle /><button ref={closeRef} className="site-menu__close" type="button" onClick={onClose} aria-label="Cerrar menú"><X size={20} strokeWidth={1.4} /></button></div>
    </div>
    <div className="site-menu__body">
      <nav className="site-menu__nav" aria-label="Secciones">
        <p className="site-menu__label">Secciones</p>
        <ol className="site-menu__sections">{siteMenuSections.map(([label, href], index) => <li key={href} style={{ animationDelay: `${80 + index * 45}ms` }}><Link href={href} onClick={onClose} aria-current={isCurrent(href) ? "page" : undefined}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><ArrowUpRight size={20} strokeWidth={1.2} /></Link></li>)}</ol>
      </nav>
      <aside className="site-menu__aside">
        <div>
          <p className="site-menu__label">La casa</p>
          <ul className="site-menu__house">{siteMenuHouse.map(([label, href], index) => <li key={href} style={{ animationDelay: `${300 + index * 40}ms` }}><Link href={href} onClick={onClose} aria-current={isCurrent(href) ? "page" : undefined}>{label}</Link></li>)}</ul>
        </div>
        <figure className="site-menu__feature"><img src="/images/GTA52.webp" alt="" loading="lazy" /><figcaption>LIGHT / Editorial campaign</figcaption></figure>
        <p className="site-menu__note">{note}</p>
      </aside>
    </div>
  </div>;
}
