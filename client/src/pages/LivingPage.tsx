import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import { usePageBanner } from "@/lib/pageBanners";
import { ArrowUpRight, Menu, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { SiteFooter } from "@/components/EditorialPageLayout";
import EditorialAccessLink from "@/components/EditorialAccessLink";
import { GuideImage, LivingCover, LivingNight, LivingRank, LivingReview } from "@/components/LivingCards";
import { arrangeLivingGuide, useLivingGuide } from "@/lib/living";

/* LIGHT Living — The Guide. Todos los lugares son selecciones editoriales ficticias de LIGHT.
   El contenido se edita en Dashboard → Living (site_settings: public:living-guide). */

type Filter = "todo" | "resorts" | "mesas" | "noches";

export default function LivingPage() {
  const banner = usePageBanner("living");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("todo");
  const [guide] = useLivingGuide();
  const { cover, resorts: resortGrid, resortCount, tables, nights } = arrangeLivingGuide(guide);
  const show = (section: Exclude<Filter, "todo">) => filter === "todo" || filter === section;

  return <div className="site-shell living-page living-guide">
    <header className="site-header"><div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button><p>Antes de que esté de moda, está en LIGHT</p><span className="topline__actions"><EditorialAccessLink /><button className="header-action" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span></div><div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div><nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link className="nav-active" href="/living">Living</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav></header>
    {menuOpen && <SiteMenuOverlay onClose={() => setMenuOpen(false)} />}
    <main>
      <section className="lg-hero">
        <div className="lg-hero__media"><GuideImage src={banner.image} position={banner.position} alt="Piscina de un resort frente al mar al atardecer" /></div>
        <div className="lg-hero__copy">
          <p className="lg-hero__kicker">LIGHT Living · The Guide · Edición 2026</p>
          <h1>Donde <em>quedarse,</em><br />dónde cenar,<br />qué <em>no perderse.</em></h1>
          <p className="lg-hero__dek">Resorts, mesas y noches seleccionados y puntuados por el equipo de LIGHT. Pocos lugares, elegidos con calma.</p>
          <div className="lg-hero__index"><a href="#resorts"><span>01</span> The Resort Edit</a><a href="#mesas"><span>02</span> La Mesa</a><a href="#noches"><span>03</span> After Dark</a></div>
        </div>
      </section>

      <nav className="lg-filter" aria-label="Filtrar la guía">
        <span>La guía</span>
        {([["todo", "Todo"], ["resorts", "Resorts"], ["mesas", "Restaurantes"], ["noches", "Eventos"]] as [Filter, string][]).map(([id, label]) => <button type="button" key={id} className={filter === id ? "is-active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
      </nav>

      {show("resorts") && resortCount > 0 && <section className="lg-section" id="resorts">
        <header className="lg-section__head"><p className="eyebrow">01 / The Resort Edit</p><h2>Para quedarse <em>más de lo previsto.</em></h2><span>{resortCount} {resortCount === 1 ? "estancia reseñada" : "estancias reseñadas"}</span></header>
        {cover && <LivingCover item={cover} />}
        {resortGrid.length > 0 && <div className="lg-grid">{resortGrid.map((item) => <LivingReview item={item} key={item.id} />)}</div>}
      </section>}

      {show("mesas") && tables.length > 0 && <section className="lg-section lg-section--tables" id="mesas">
        <header className="lg-section__head"><p className="eyebrow">02 / La Mesa</p><h2>Las mesas <em>de la temporada.</em></h2><span>Ranking LIGHT</span></header>
        <ol className="lg-ranking">{tables.map((item, index) => <LivingRank item={item} position={index + 1} key={item.id} />)}</ol>
      </section>}

      {show("noches") && nights.length > 0 && <section className="lg-section lg-section--nights" id="noches">
        <header className="lg-section__head"><p className="eyebrow">03 / After Dark</p><h2>Noches que <em>se cuentan después.</em></h2><Link className="lg-link" href="/eventos">Cobertura de Eventos <ArrowUpRight size={14} /></Link></header>
        <div className="lg-nights">{nights.map((item) => <LivingNight item={item} key={item.id} />)}</div>
      </section>}

      <section className="lg-method">
        <div><p className="eyebrow">Cómo puntuamos</p><h2>Cinco marcas, <em>cuatro preguntas.</em></h2></div>
        <ol>{[["Servicio", "¿Te anticipan sin invadirte?"], ["Diseño", "¿El espacio tiene una idea, o solo decoración?"], ["Experiencia", "¿Recordarás algo concreto dentro de un año?"], ["Valor", "¿Lo que pagas corresponde a lo que vives?"]].map(([title, question], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong><p>{question}</p></li>)}</ol>
        <p className="lg-method__note">Cada criterio se puntúa de 1 a 5 y la nota final es su media. Una puntuación de 4,5 o más es una recomendación sin reservas.</p>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
