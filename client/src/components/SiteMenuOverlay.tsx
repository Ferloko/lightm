import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { Link, useLocation } from "wouter";
import MenuThemeToggle from "./MenuThemeToggle";

export const siteMenuLinks: [string, string][] = [["Inicio", "/"], ["Moda", "/moda"], ["Belleza", "/belleza"], ["Eventos", "/eventos"], ["Living", "/living"], ["Runway", "/runway"], ["Masthead", "/masthead"], ["Business", "/business"], ["La revista", "/sobre-moda"], ["About Us", "/about"], ["Archivo", "/archivo"], ["Newsletter", "/newsletter"]];

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
  return <div className="light-menu" role="dialog" aria-modal="true" aria-label="Menú de navegación">
    <div className="light-menu__top"><span className="light-menu__edition">LIGHT</span><div className="light-menu__actions"><MenuThemeToggle /><button ref={closeRef} className="light-menu__close" type="button" onClick={onClose} aria-label="Cerrar menú"><X size={22} strokeWidth={1.3} /></button></div></div>
    <div className="light-menu__body">
      <div className="light-menu__inner">
        <p className="eyebrow">Explora la revista</p>
        <nav className="light-menu__links" aria-label="Secciones">{siteMenuLinks.map(([label, href], index) => <Link href={href} key={href} onClick={onClose} aria-current={isCurrent(href) ? "page" : undefined} style={{ "--i": index } as CSSProperties}><span>{String(index + 1).padStart(2, "0")}</span>{label}<ArrowUpRight size={22} strokeWidth={1.2} /></Link>)}</nav>
        <p className="light-menu__note">{note}</p>
      </div>
      <figure className="light-menu__campaign"><div><img src="/images/GTA52.webp" alt="" /></div><figcaption>LIGHT / Editorial campaign</figcaption></figure>
    </div>
  </div>;
}
