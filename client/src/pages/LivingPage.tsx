import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import { ArrowUpRight, Menu, Search } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { SiteFooter } from "@/components/EditorialPageLayout";
import EditorialAccessLink from "@/components/EditorialAccessLink";

/* LIGHT Living — The Guide. All venues are fictional LIGHT editorial picks (no real businesses are rated). */

type Scores = { servicio: number; diseno: number; experiencia: number; valor: number };
type Resort = { id: string; name: string; place: string; kind: string; image: string; scores: Scores; verdict: string; idealFor: string; price: 1 | 2 | 3 | 4 };
type Table = { id: string; name: string; cuisine: string; area: string; image: string; score: number; verdict: string; price: 1 | 2 | 3 | 4; signature: string };
type Night = { id: string; date: string; title: string; venue: string; image: string; score: number; note: string; status: "Plazas limitadas" | "Lista de espera" | "Abierto" };

const resorts: Resort[] = [
  { id: "casa-aurelia", name: "Casa Aurelia", place: "Costa Norte", kind: "Resort & Spa", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=90", scores: { servicio: 4.9, diseno: 4.8, experiencia: 4.9, valor: 4.4 }, verdict: "Un resort que entiende el lujo como silencio: piscinas que miran al horizonte, servicio que se anticipa y noches sin prisa.", idealFor: "Escapadas largas en pareja", price: 4 },
  { id: "hotel-marisol", name: "Hotel Marisol", place: "Bahía Clara", kind: "Hotel de playa", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=90", scores: { servicio: 4.6, diseno: 4.5, experiencia: 4.7, valor: 4.6 }, verdict: "Arena blanca, lino y una terraza al atardecer que justifica el viaje por sí sola.", idealFor: "Fines de semana de sol", price: 3 },
  { id: "the-glass-house", name: "The Glass House", place: "Valle Alto", kind: "Refugio de diseño", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=90", scores: { servicio: 4.4, diseno: 4.9, experiencia: 4.6, valor: 4.2 }, verdict: "Arquitectura que desaparece en el paisaje. Pocas habitaciones, mucha luz y una biblioteca que invita a quedarse.", idealFor: "Desconectar de verdad", price: 4 },
  { id: "kasa-niwa", name: "Kasa Niwa", place: "Distrito Antiguo", kind: "Ryokan contemporáneo", image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=90", scores: { servicio: 4.8, diseno: 4.7, experiencia: 4.8, valor: 4.3 }, verdict: "El ritual como forma de hospitalidad: jardines, té al amanecer y un baño que cambia el ritmo del día.", idealFor: "Viajeros que buscan calma", price: 3 },
];

const tables: Table[] = [
  { id: "osteria-lume", name: "Osteria Lume", cuisine: "Italiana de autor", area: "Puerto Viejo", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=90", score: 4.8, verdict: "Pasta fresca, vinos naturales y una sala que suena a celebración.", price: 3, signature: "Tagliolini al limón y bottarga" },
  { id: "le-jardin-noir", name: "Le Jardin Noir", cuisine: "Francesa contemporánea", area: "Jardines del Este", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=90", score: 4.7, verdict: "Un menú degustación que juega con la sombra y la luz, servido con precisión de reloj.", price: 4, signature: "Pichón, cereza y cacao" },
  { id: "mar-de-fondo", name: "Mar de Fondo", cuisine: "Marisquería", area: "Muelle Sur", image: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1000&q=90", score: 4.5, verdict: "Producto del día, brasa y una barra frente al mar para comer sin mirar el reloj.", price: 2, signature: "Pescado entero a la brasa" },
  { id: "salon-ocho", name: "Salón Ocho", cuisine: "Cocina de temporada", area: "Centro", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=90", score: 4.4, verdict: "Ocho mesas, una carta que cambia cada semana y la sensación de cenar en casa de alguien con mucho gusto.", price: 2, signature: "Tomates de huerta y aceite verde" },
];

const nights: Night[] = [
  { id: "casa-light", date: "12—15 JUN", title: "Casa LIGHT", venue: "Casa Aurelia · Costa Norte", image: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1000&q=90", score: 4.9, note: "Cuatro días de cocina, cerámica y mar con el equipo de LIGHT.", status: "Plazas limitadas" },
  { id: "open-rooms", date: "04—07 SEP", title: "Open Rooms", venue: "Kasa Niwa · Distrito Antiguo", image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1000&q=90", score: 4.7, note: "Arquitectura, jardines y el ritual del té en sesiones privadas.", status: "Lista de espera" },
  { id: "mesa-larga", date: "21 OCT", title: "Una mesa larga", venue: "Salón Ocho · Centro", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=90", score: 4.6, note: "Una cena compartida para cerrar la temporada.", status: "Abierto" },
];

const criteria: [keyof Scores, string][] = [["servicio", "Servicio"], ["diseno", "Diseño"], ["experiencia", "Experiencia"], ["valor", "Valor"]];
const overall = (scores: Scores) => Math.round(((scores.servicio + scores.diseno + scores.experiencia + scores.valor) / 4) * 10) / 10;
const fmt = (value: number) => value.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
type Filter = "todo" | "resorts" | "mesas" | "noches";

/** Five LIGHT marks, filled to the score (half marks included). */
function Rating({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  return <span className={`living-rating living-rating--${size}`} aria-label={`${fmt(value)} sobre 5`}><strong>{fmt(value)}</strong><span className="living-rating__marks" aria-hidden="true">{[1, 2, 3, 4, 5].map((mark) => <i key={mark} style={{ "--fill": `${Math.max(0, Math.min(1, value - mark + 1)) * 100}%` } as CSSProperties} />)}</span></span>;
}
const Price = ({ level }: { level: number }) => <span className="living-price" aria-label={`Precio ${level} de 4`}>{[1, 2, 3, 4].map((step) => <b key={step} className={step <= level ? "is-on" : ""}>$</b>)}</span>;
function GuideImage({ src, alt = "" }: { src: string; alt?: string }) { return <img src={src} alt={alt} loading="lazy" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />; }

export default function LivingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("todo");
  const [cover, ...resortGrid] = resorts;
  const show = (section: Exclude<Filter, "todo">) => filter === "todo" || filter === section;

  return <div className="site-shell living-page living-guide">
    <header className="site-header"><div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button><p>Antes de que esté de moda, está en LIGHT</p><span className="topline__actions"><EditorialAccessLink /><button className="header-action" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span></div><div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div><nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link className="nav-active" href="/living">Living</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav></header>
    {menuOpen && <SiteMenuOverlay onClose={() => setMenuOpen(false)} />}
    <main>
      <section className="lg-hero">
        <div className="lg-hero__media"><GuideImage src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=90" alt="Piscina de un resort frente al mar al atardecer" /></div>
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

      {show("resorts") && <section className="lg-section" id="resorts">
        <header className="lg-section__head"><p className="eyebrow">01 / The Resort Edit</p><h2>Para quedarse <em>más de lo previsto.</em></h2><span>{resorts.length} estancias reseñadas</span></header>
        <article className="lg-cover">
          <div className="lg-cover__media"><GuideImage src={cover.image} alt={cover.name} /><span className="lg-badge">LIGHT Pick · N.º 1</span></div>
          <div className="lg-cover__body">
            <p className="lg-meta">{cover.kind} · {cover.place}</p>
            <h3>{cover.name}</h3>
            <Rating value={overall(cover.scores)} size="lg" />
            <blockquote>“{cover.verdict}”</blockquote>
            <dl className="lg-scores">{criteria.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><span><i style={{ width: `${(cover.scores[key] / 5) * 100}%` }} /></span><b>{fmt(cover.scores[key])}</b></dd></div>)}</dl>
            <div className="lg-cover__foot"><span><small>Ideal para</small>{cover.idealFor}</span><span><small>Precio</small><Price level={cover.price} /></span></div>
          </div>
        </article>
        <div className="lg-grid">{resortGrid.map((item) => <article className="lg-review" key={item.id}>
          <div className="lg-review__media"><GuideImage src={item.image} alt={item.name} /><span className="lg-review__score"><Rating value={overall(item.scores)} size="sm" /></span></div>
          <p className="lg-meta">{item.kind} · {item.place}</p>
          <h3>{item.name}</h3>
          <p className="lg-review__verdict">{item.verdict}</p>
          <dl className="lg-scores lg-scores--compact">{criteria.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><span><i style={{ width: `${(item.scores[key] / 5) * 100}%` }} /></span></dd></div>)}</dl>
          <div className="lg-review__foot"><span>{item.idealFor}</span><Price level={item.price} /></div>
        </article>)}</div>
      </section>}

      {show("mesas") && <section className="lg-section lg-section--tables" id="mesas">
        <header className="lg-section__head"><p className="eyebrow">02 / La Mesa</p><h2>Las mesas <em>de la temporada.</em></h2><span>Ranking LIGHT</span></header>
        <ol className="lg-ranking">{tables.map((item, index) => <li key={item.id} className="lg-rank">
          <span className="lg-rank__number">{String(index + 1).padStart(2, "0")}</span>
          <div className="lg-rank__media"><GuideImage src={item.image} alt={item.name} /></div>
          <div className="lg-rank__main"><h3>{item.name}</h3><p className="lg-meta">{item.cuisine} · {item.area}</p><p className="lg-rank__verdict">{item.verdict}</p></div>
          <div className="lg-rank__side"><Rating value={item.score} /><Price level={item.price} /><small>Pedir: {item.signature}</small></div>
        </li>)}</ol>
      </section>}

      {show("noches") && <section className="lg-section lg-section--nights" id="noches">
        <header className="lg-section__head"><p className="eyebrow">03 / After Dark</p><h2>Noches que <em>se cuentan después.</em></h2><Link className="lg-link" href="/eventos">Cobertura de Eventos <ArrowUpRight size={14} /></Link></header>
        <div className="lg-nights">{nights.map((item) => <article className="lg-night" key={item.id}>
          <div className="lg-night__media"><GuideImage src={item.image} alt="" /><span className="lg-night__date">{item.date}</span></div>
          <div className="lg-night__body"><p className="lg-meta">{item.venue}</p><h3>{item.title}</h3><p>{item.note}</p><div className="lg-night__foot"><Rating value={item.score} size="sm" /><span className={`lg-status lg-status--${item.status === "Abierto" ? "open" : item.status === "Lista de espera" ? "wait" : "few"}`}>{item.status}</span></div></div>
        </article>)}</div>
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
