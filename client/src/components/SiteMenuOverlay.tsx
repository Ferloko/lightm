import { ArrowUpRight, X } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import MenuThemeToggle from "./MenuThemeToggle";

export const siteMenuLinks: [string, string][] = [["Inicio", "/"], ["Moda", "/moda"], ["Belleza", "/belleza"], ["Eventos", "/eventos"], ["Living", "/living"], ["Runway", "/runway"], ["Masthead", "/masthead"], ["Business", "/business"], ["La revista", "/sobre-moda"], ["Archivo", "/archivo"], ["Newsletter", "/newsletter"]];

/** The three-line menu, identical on every public page. */
export default function SiteMenuOverlay({ onClose, note = "Historias para mirar más de cerca." }: { onClose: () => void; note?: string }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);
  return <div className="menu-overlay" role="dialog" aria-modal="true" aria-label="Menú de navegación">
    <div className="menu-overlay__top"><span className="menu-overlay__edition">LIGHT</span><MenuThemeToggle /><button className="close-button" type="button" onClick={onClose} aria-label="Cerrar menú"><X size={22} strokeWidth={1.3} /></button></div>
    <div className="menu-overlay__inner"><p className="eyebrow">Explora la revista</p><div className="menu-overlay__links">{siteMenuLinks.map(([label, href], index) => <Link href={href} key={href} onClick={onClose}><span>{String(index + 1).padStart(2, "0")}</span>{label}<ArrowUpRight size={22} strokeWidth={1.2} /></Link>)}</div><p className="menu-overlay__note">{note}</p></div>
  </div>;
}
