import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import FollowLinks from "@/components/FollowLinks";
import { ArrowUpRight, Mail, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { fetchPublishedArticleSummaries, type EditorialArticle } from "@/lib/editorial";
import { subscribeToTable } from "@/lib/supabase";
import { StoryCardsSkeleton } from "@/components/EditorialSkeleton";
import EditorialAccessLink from "@/components/EditorialAccessLink";

const images = {
  moda: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1500&q=90",
  belleza: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1500&q=90",
  eventos: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1500&q=90",
  sociedad: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1500&q=90",
};

const sections = {
  moda: { label: "Moda", title: "La forma que viene.", dek: "Diseñadores, prendas e ideas que dibujan otra manera de vestir el presente.", intro: "Historias de moda, autoría y oficio: una selección editorial para mirar de cerca las siluetas que están cambiando.", image: images.moda },
  belleza: { label: "Belleza", title: "Habitar la piel.", dek: "Rituales, texturas y voces que imaginan una belleza más propia y sin reglas prestadas.", intro: "Una mirada a la belleza desde el cuidado, la expresión y los gestos cotidianos que nos devuelven a nosotros mismos.", image: images.belleza },
  eventos: { label: "Eventos", title: "La ciudad nos convoca.", dek: "Encuentros, aperturas y acontecimientos para mirar el presente desde otro lugar.", intro: "Crónicas, conversaciones y cobertura de los eventos que reúnen ideas, personas y escenas. Cada historia abre un espacio para contar qué ocurrió, quiénes estuvieron y por qué merece recordarse.", image: images.eventos },
  sociedad: { label: "Sociedad", title: "El gesto propio.", dek: "Las voces que abren conversaciones nuevas y construyen comunidad desde la diferencia.", intro: "Personas, ideas y conversaciones para entender cómo se transforma la vida en común.", image: images.sociedad },
} as const;

type SectionKey = keyof typeof sections;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="section-label"><span className="section-label__line" />{children}</span>;
}

function Footer() {
  return <footer className="site-footer"><div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">LIGHT</Link><p>Una revista sobre lo que nos mueve.</p></div><div className="site-footer__columns"><div><p className="footer-heading">Explora</p><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link></div><div><p className="footer-heading">La revista</p><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/masthead">Masthead</Link><Link href="/business">Business</Link><Link href="/about">About Us</Link><Link href="/business#colaboraciones">Colaboraciones</Link></div><div><p className="footer-heading">Síguenos</p><FollowLinks /><Link href="/business#colaboraciones"><Mail size={15} /> Correo</Link></div><div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© LIGHT 2026</span></div></div><div className="site-footer__bottom"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/cookies">Cookies</Link><span className="footer-bottom__right">San Andreas, United States</span></div></footer>;
}

export default function SectionPage({ section }: { section: SectionKey }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [articles, setArticles] = useState<EditorialArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const current = sections[section];

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void fetchPublishedArticleSummaries().then((items) => {
        if (active) setArticles(items.filter((article) => article.category.trim().toLocaleLowerCase() === current.label.toLocaleLowerCase()));
      }).finally(() => { if (active) setArticlesLoading(false); });
    };
    refresh();
    const unsubscribe = subscribeToTable("articles", refresh);
    window.addEventListener("light:editorial-updated", refresh);
    return () => { active = false; unsubscribe(); window.removeEventListener("light:editorial-updated", refresh); };
  }, [current.label]);

  return <div className={`site-shell subpage subpage--${section}`}>
    <header className="site-header">
      <div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button><p>Antes de que esté de moda, está en LIGHT</p><span className="topline__actions"><EditorialAccessLink /><button className="header-action" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span></div>
      <div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div>
      <nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav>
    </header>
    {menuOpen && <SiteMenuOverlay onClose={() => setMenuOpen(false)} />}
    <main>
      <section className="subpage-hero subpage-hero--living-layout">
        <div className="subpage-hero__image"><img src={current.image} alt={`${current.label}, selección editorial LIGHT`} /><span>LIGHT / {current.label.toUpperCase()}</span></div>
        <div className="subpage-hero__copy"><SectionLabel>{current.label} / </SectionLabel><h1>{current.title}</h1><p>{current.dek}</p><a className="story-link" href="#historias">Explorar historias <ArrowUpRight size={16} /></a></div>
      </section>
      <section className={`subpage-intro${section === "eventos" ? " subpage-intro--events" : ""}`}><p className="eyebrow">{section === "eventos" ? "Cobertura / Encuentros" : "La edición"}</p><p>{current.intro}</p></section>
      <section className="subpage-stories" id="historias"><div className="subpage-stories__heading"><SectionLabel>{section === "eventos" ? "Historias y cobertura" : `Historias de ${current.label}`}</SectionLabel><span>{articlesLoading ? "Cargando historias" : `${articles.length} ${articles.length === 1 ? "artículo publicado" : "artículos publicados"}`}</span></div>
        {articlesLoading ? <StoryCardsSkeleton label={`Cargando historias de ${current.label.toLowerCase()}`} /> : articles.length ? <div className="subpage-stories__grid">{articles.map((article, index) => <Link className="subpage-story" href={`/historias/${article.slug || article.id}`} key={article.id}><div className="subpage-story__image">{article.image ? <img src={article.image} alt={article.title} /> : <div className="subpage-story__image-empty">LIGHT</div>}<span>0{index + 1}</span></div><p className="eyebrow">{current.label}{article.date ? ` · ${article.date}` : ""}</p><h2>{article.title}</h2>{article.excerpt && <p className="subpage-story__excerpt">{article.excerpt}</p>}<span className="subpage-story__read">Leer historia <ArrowUpRight size={15} /></span></Link>)}</div> : <div className="section-articles-empty"><p className="eyebrow">{current.label} / Próximamente</p><h2>La próxima historia empieza aquí.</h2><p>Cuando publiques un artículo visible con categoría {current.label} desde el Dashboard, aparecerá en esta sección.</p><Link href="/archivo" className="story-link">Explorar el archivo <ArrowUpRight size={15} /></Link></div>}
      </section>
      <section className="subpage-marquee"><span>LIGHT</span><span>{current.label.toUpperCase()}</span><span>LIGHT</span></section>
    </main>
    <Footer />
  </div>;
}
