import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Instagram,
  Mail,
  Menu,
  Search,
  X,
  Youtube,
} from "lucide-react";
import { Link } from "wouter";

const images = {
  hero: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=90",
  silhouette: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=90",
  portrait: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1100&q=90",
  beauty: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1100&q=90",
  culture: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=90",
  minimal: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=90",
  detail: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=90",
};

const navItems = ["Moda", "Belleza", "Cultura", "Sociedad", "Runway"];

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span className={`section-label ${light ? "section-label--light" : ""}`}>
      <span className="section-label__line" />
      {children}
    </span>
  );
}

function StoryLink({ children, href = "/historias/vestirse-de-futuro" }: { children: React.ReactNode; href?: string }) {
  return (
    <Link className="story-link" href={href}>
      {children}
      <ArrowUpRight size={16} strokeWidth={1.5} />
    </Link>
  );
}

function StoryCard({
  image,
  category,
  title,
  excerpt,
  tone = "light",
}: {
  image: string;
  category: string;
  title: string;
  excerpt?: string;
  tone?: "light" | "dark";
}) {
  return (
    <article className={`story-card story-card--${tone}`}>
      <div className="story-card__image-wrap">
        <img className="story-card__image" src={image} alt="" />
        <span className="story-card__index">01</span>
      </div>
      <div className="story-card__body">
        <p className="eyebrow">{category}</p>
        <h3>{title}</h3>
        {excerpt && <p className="story-card__excerpt">{excerpt}</p>}
        <StoryLink>Leer historia</StoryLink>
      </div>
    </article>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todo");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="topline">
          <button className="header-action header-action--menu" type="button" onClick={() => setMenuOpen(true)}>
            <Menu size={20} strokeWidth={1.4} />
            <span>Menú</span>
          </button>
          <p>La conversación de estilo, sin concesiones.</p>
          <button className="header-action" type="button" aria-label="Buscar">
            <Search size={19} strokeWidth={1.4} />
            <span>Buscar</span>
          </button>
        </div>
        <div className="brand-row">
          <Link href="/" className="wordmark" aria-label="MODA inicio">MODA</Link>
          <div className="brand-meta">
            <span>Edición 06</span>
            <span>Octubre 2026</span>
          </div>
        </div>
        <nav className="main-nav" aria-label="Navegación principal">
              {navItems.map((item, index) => (
            <Link href={`/${item.toLowerCase()}`} key={item}>
              {item}
              {index === 0 && <span className="nav-new">Nuevo</span>}
            </Link>
          ))}
          <Link href="/sobre-moda">La revista <ChevronDown size={14} strokeWidth={1.4} /></Link>
        </nav>
      </header>

      {menuOpen && (
        <div className="menu-overlay" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div className="menu-overlay__top">
            <span className="menu-overlay__edition">MODA / 06</span>
            <button className="close-button" type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
              <X size={22} strokeWidth={1.3} />
            </button>
          </div>
          <div className="menu-overlay__inner">
            <p className="eyebrow">Explora la revista</p>
            <div className="menu-overlay__links">
              {["Inicio", ...navItems, "Archivo", "Newsletter"].map((item, index) => (
                <Link href={index === 0 ? "/" : item === "Archivo" ? "/archivo" : item === "Newsletter" ? "/newsletter" : `/${item.toLowerCase()}`} key={item} onClick={() => setMenuOpen(false)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>{item}<ArrowUpRight size={22} strokeWidth={1.2} />
                </Link>
              ))}
            </div>
            <p className="menu-overlay__note">Historias para mirar más de cerca.</p>
          </div>
        </div>
      )}

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <SectionLabel>Portada / Octubre 2026</SectionLabel>
            <h1>La nueva<br /><em>sensibilidad</em><br />del vestir.</h1>
            <p className="hero-dek">Una exploración de las formas, texturas y gestos que están redefiniendo el lujo para una generación que elige con intención.</p>
            <StoryLink href="/historias/vestirse-de-futuro">Descubrir la portada</StoryLink>
          </div>
          <div className="hero-visual">
            <img src={images.hero} alt="Editorial de moda con prendas en tonos neutros" />
            <div className="hero-stamp"><span>MODA</span><span>VOL. 06</span></div>
            <div className="hero-caption"><span>01 — 04</span><span>Fotografía: Estudio MODA</span></div>
          </div>
        </section>

        <section className="intro-band" id="moda">
          <p className="intro-band__number">06—26</p>
          <div className="intro-band__copy">
            <SectionLabel>El número</SectionLabel>
            <p>De la sastrería silenciosa a las voces que abren nuevas conversaciones, este número mira hacia lo esencial: lo que perdura, lo que transforma, lo que merece espacio.</p>
          </div>
          <div className="intro-band__mark">↘</div>
        </section>

        <section className="feature-grid" id="belleza">
          <div className="feature-grid__lead">
            <img src={images.silhouette} alt="Silueta contemporánea en un editorial de moda" />
            <div className="feature-grid__lead-caption"><span>02</span><span>La forma de lo nuevo</span></div>
          </div>
          <article className="feature-grid__story">
            <SectionLabel>Moda</SectionLabel>
            <h2>Vestirse<br /><em>de futuro.</em></h2>
            <p>Las prendas ya no siguen una sola dirección. Un armario más libre mezcla memoria, tecnología y una nueva idea de lo que significa estar bien vestido.</p>
            <div className="story-meta"><span>Por Inés Valdés</span><span>12 min de lectura</span></div>
            <StoryLink href="/historias/vestirse-de-futuro">Leer el artículo</StoryLink>
          </article>
          <div className="feature-grid__aside">
            <span className="vertical-note">ESTUDIO / 2026</span>
            <p>“La elegancia no es una respuesta: es una forma de hacer preguntas.”</p>
          </div>
        </section>

        <section className="editorial-section" id="cultura">
          <div className="section-heading">
            <div>
              <SectionLabel>Selección MODA</SectionLabel>
              <h2>Historias para<br /><em>quedarse.</em></h2>
            </div>
            <Link className="all-link" href="/archivo">Ver archivo <ArrowUpRight size={16} strokeWidth={1.4} /></Link>
          </div>
          <div className="story-grid">
            <StoryCard image={images.portrait} category="Sociedad" title="El gesto propio" excerpt="Cinco creadoras hablan de la intuición como una forma de poder." />
            <StoryCard image={images.beauty} category="Belleza" title="Piel real, luz propia" excerpt="El nuevo lenguaje del cuidado empieza por escuchar." tone="dark" />
            <StoryCard image={images.culture} category="Cultura" title="Arquitecturas íntimas" excerpt="Los espacios que habitamos también cuentan quiénes somos." />
          </div>
        </section>

        <section className="trend-section" id="sociedad">
          <div className="trend-section__header">
            <SectionLabel light>Tendencias</SectionLabel>
            <span className="trend-section__issue">ISSUE 06 / 2026</span>
          </div>
          <div className="trend-section__content">
            <div className="trend-section__title">
              <p className="trend-kicker">La guía</p>
              <h2>Lo que<br />está <em>por venir.</em></h2>
              <p>Una lectura rápida de las señales que están cambiando el paisaje visual.</p>
            </div>
            <div className="trend-list">
              {["El color de la pausa", "Objetos con memoria", "La textura como lenguaje"].map((trend, index) => (
                <button type="button" className="trend-item" key={trend}>
                  <span>0{index + 1}</span>
                  <strong>{trend}</strong>
                  <ArrowDownRight size={20} strokeWidth={1.2} />
                </button>
              ))}
            </div>
          </div>
          <div className="trend-section__image"><img src={images.detail} alt="Detalle de joyería contemporánea" /></div>
        </section>

        <section className="voices-section" id="revista">
          <div className="voices-section__heading">
            <SectionLabel>Cartas de estilo</SectionLabel>
            <h2>Una mirada<br /><em>en movimiento.</em></h2>
          </div>
          <div className="voices-section__main">
            <img src={images.minimal} alt="Retrato editorial en blanco y negro" />
            <div className="voices-section__quote"><span>“</span><p>La belleza aparece cuando dejamos de perseguirla.</p><small>— Amaia Ortiz, artista</small></div>
          </div>
          <div className="voices-section__side">
            <p className="eyebrow">Conversaciones</p>
            <h3>El estilo también es una forma de escuchar.</h3>
            <p>Entrevistas, objetos y lugares que amplían la idea de lo contemporáneo.</p>
            <StoryLink href="/sobre-moda">Conocer las voces</StoryLink>
          </div>
        </section>

        <section className="newsletter-section" id="newsletter">
          <div className="newsletter-section__copy"><SectionLabel>Correspondencia MODA</SectionLabel><h2>Lo mejor de la semana,<br /><em>en tu bandeja.</em></h2></div>
          <div className="newsletter-section__form-wrap">
            {subscribed ? (
              <div className="newsletter-success"><span>Gracias por estar aquí.</span><small>Revisa tu bandeja para confirmar la suscripción.</small></div>
            ) : (
              <form onSubmit={handleSubscribe} className="newsletter-form">
                <label htmlFor="email">Tu correo electrónico</label>
                <div><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" required /><button type="submit" aria-label="Suscribirme"><ArrowUpRight size={20} strokeWidth={1.4} /></button></div>
                <p>Una carta editorial. Sin ruido. Puedes salir cuando quieras.</p>
              </form>
            )}
          </div>
        </section>

        <section className="archive-section" id="archivo">
          <div className="archive-section__top"><SectionLabel>Archivo visual</SectionLabel><div className="filter-row">{["Todo", "Moda", "Belleza", "Cultura"].map((item) => <button type="button" className={activeCategory === item ? "is-active" : ""} onClick={() => setActiveCategory(item)} key={item}>{item}</button>)}</div></div>
          <div className="archive-strip">
            <div className="archive-card"><span>06.01</span><img src={images.hero} alt="" /><strong>El nuevo uniforme</strong></div>
            <div className="archive-card archive-card--offset"><span>05.18</span><img src={images.beauty} alt="" /><strong>La piel como paisaje</strong></div>
            <div className="archive-card"><span>04.02</span><img src={images.culture} alt="" /><strong>Materia y memoria</strong></div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">MODA</Link><p>Una revista sobre lo que nos mueve.</p><Link className="back-top" href="/">Volver arriba <ChevronRight size={16} /></Link></div>
        <div className="site-footer__columns">
          <div><p className="footer-heading">Explora</p><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/cultura">Cultura</Link><Link href="/sociedad">Sociedad</Link></div>
          <div><p className="footer-heading">La revista</p><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/sobre-moda">Sobre MODA</Link><Link href="/contacto">Contacto</Link></div>
          <div><p className="footer-heading">Síguenos</p><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> Instagram</a><a href="https://youtube.com" target="_blank" rel="noreferrer"><Youtube size={15} /> YouTube</a><Link href="/contacto"><Mail size={15} /> Correo</Link></div>
          <div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© MODA 2026</span></div>
        </div>
        <div className="site-footer__bottom"><span>Privacidad</span><span>Términos</span><span>Cookies</span><span className="footer-bottom__right">Madrid · Ciudad de México · Buenos Aires</span></div>
      </footer>
    </div>
  );
}
