import { ArrowUpRight, Search } from "lucide-react";
import { usePageBanner } from "@/lib/pageBanners";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import EditorialPageLayout from "@/components/EditorialPageLayout";
import HeroArt from "@/components/HeroArt";

// Hosting answers this path with HTTP 404 while still serving the app.
const NOT_FOUND_PATH = "/404";
const MISSING_PATH_KEY = "light.not-found.path";

const suggestions: [string, string, string][] = [
  ["Inicio", "/", "La portada de esta edición"],
  ["Moda", "/moda", "Siluetas, oficios y gestos"],
  ["La revista", "/sobre-moda", "Todas las ediciones digitales"],
  ["Archivo", "/archivo", "Historias que merecen volver"],
  ["About Us", "/about", "Quiénes somos"],
];

// Render for unknown routes and for items the server confirmed missing (e.g. `/page/:id`).
// The redirect is irreversible: never render while loading, on other errors, or before auth resolves.
export default function NotFound() {
  const banner = usePageBanner("not-found");
  const [missingPath, setMissingPath] = useState<string | null>(null);

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    document.title = "Página no encontrada — LIGHT";

    // Full-page navigation: a client-side route change sends no request, so no 404 status.
    // The path the visitor tried is kept so the page can still name it after the redirect.
    if (window.location.pathname.replace(/\/$/, "") !== NOT_FOUND_PATH) {
      try { sessionStorage.setItem(MISSING_PATH_KEY, window.location.pathname); } catch { /* optional */ }
      window.location.replace(NOT_FOUND_PATH);
    } else {
      try { setMissingPath(sessionStorage.getItem(MISSING_PATH_KEY)); sessionStorage.removeItem(MISSING_PATH_KEY); } catch { /* optional */ }
    }

    return () => { robots.remove(); document.title = "LIGHT — Revista de estilo"; };
  }, []);

  return <EditorialPageLayout activePath="">
    <section className="not-found">
      <div className="not-found__top"><div className="not-found__number" aria-hidden="true"><span>4</span><em>0</em><span>4</span></div><HeroArt src={banner.image} position={banner.position} caption="LIGHT / Fuera de edición" /></div>
      <div className="not-found__copy">
        <p className="eyebrow">LIGHT / Fuera de edición</p>
        <h1>Esta página no está <em>en ninguna edición.</em></h1>
        <p>Puede que el enlace haya cambiado, que la historia ya no esté publicada o que hayas llegado antes que nosotros. La curiosidad nos gusta: aquí tienes por dónde seguir.</p>
        {missingPath && <p className="not-found__path"><span>Buscabas</span><code>{missingPath}</code></p>}
        <div className="not-found__actions">
          <Link className="admin-primary not-found__home" href="/">Volver a la portada <ArrowUpRight size={15} /></Link>
          <button className="not-found__search" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={15} /> Buscar en LIGHT</button>
        </div>
      </div>
      <nav className="not-found__links" aria-label="Sugerencias">
        <p className="eyebrow">Quizá buscabas</p>
        {suggestions.map(([label, href, note]) => <Link href={href} key={href}><strong>{label}</strong><small>{note}</small><ArrowUpRight size={16} /></Link>)}
      </nav>
    </section>
  </EditorialPageLayout>;
}
