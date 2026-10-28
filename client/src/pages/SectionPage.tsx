import { ArrowUpRight, ChevronRight, Instagram, Mail, Menu, Search, X, Youtube } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const images = {
  moda: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1500&q=90",
  belleza: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1500&q=90",
  cultura: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1500&q=90",
  sociedad: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1500&q=90",
  detail: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=90",
};

const sections = {
  moda: { label: "Moda", title: "Vestirse de futuro.", dek: "Prendas, diseñadores y gestos que están dando forma a una nueva idea de elegancia.", image: images.moda, stories: ["La sastrería que aprendió a respirar", "El nuevo uniforme", "Manual para una silueta propia"] },
  belleza: { label: "Belleza", title: "Piel real, luz propia.", dek: "El cuidado como conversación: rituales, texturas y una belleza que no pide permiso.", image: images.belleza, stories: ["La piel como paisaje", "El color de la pausa", "Rostros que no se esconden"] },
  cultura: { label: "Cultura", title: "Arquitecturas íntimas.", dek: "Ideas, lugares y objetos que amplían la forma en que miramos el presente.", image: images.cultura, stories: ["Las casas que cuentan historias", "Materia y memoria", "Un museo en movimiento"] },
  sociedad: { label: "Sociedad", title: "El gesto propio.", dek: "Las voces que abren conversaciones nuevas y construyen comunidad desde la diferencia.", image: images.sociedad, stories: ["El poder de elegir distinto", "Cinco creadoras, cinco formas de mirar", "La conversación continúa"] },
} as const;

type SectionKey = keyof typeof sections;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="section-label"><span className="section-label__line" />{children}</span>;
}

function Footer() {
  return <footer className="site-footer"><div className="site-footer__top"><Link href="/" className="wordmark wordmark--footer">LIGHT</Link><p>Una revista sobre lo que nos mueve.</p></div><div className="site-footer__columns"><div><p className="footer-heading">Explora</p><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/cultura">Cultura</Link><Link href="/sociedad">Sociedad</Link></div><div><p className="footer-heading">La revista</p><Link href="/archivo">Archivo</Link><Link href="/newsletter">Newsletter</Link><Link href="/sobre-moda">Sobre LIGHT</Link><Link href="/contacto">Contacto</Link></div><div><p className="footer-heading">Síguenos</p><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> Instagram</a><a href="https://youtube.com" target="_blank" rel="noreferrer"><Youtube size={15} /> YouTube</a><Link href="/contacto"><Mail size={15} /> Correo</Link></div><div className="footer-signoff"><p>Hecho para mirar<br /><em>más de cerca.</em></p><span>© LIGHT 2026</span></div></div><div className="site-footer__bottom"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/cookies">Cookies</Link><span className="footer-bottom__right">Madrid · Ciudad de México · Buenos Aires</span></div></footer>;
}

export default function SectionPage({ section }: { section: SectionKey }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = sections[section];
  return <div className={`site-shell subpage subpage--${section}`}><header className="site-header"><div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button><p>La conversación de estilo, sin concesiones.</p><button className="header-action" type="button"><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></div><div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div><nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/cultura">Cultura</Link><Link href="/sociedad">Sociedad</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav></header>{menuOpen && <div className="menu-overlay" role="dialog" aria-modal="true"><div className="menu-overlay__top"><span className="menu-overlay__edition">LIGHT</span><button className="close-button" type="button" onClick={() => setMenuOpen(false)}><X size={22} /></button></div><div className="menu-overlay__inner"><p className="eyebrow">Explora la revista</p><div className="menu-overlay__links">{[["Inicio", "/"], ["Moda", "/moda"], ["Belleza", "/belleza"], ["Cultura", "/cultura"], ["Sociedad", "/sociedad"], ["Runway", "/runway"], ["La revista", "/sobre-moda"], ["Archivo", "/archivo"], ["Newsletter", "/newsletter"]].map(([label, href], index) => <Link href={href} key={label} onClick={() => setMenuOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span>{label}<ArrowUpRight size={22} /></Link>)}</div></div></div>}<main><section className="subpage-hero"><div className="subpage-hero__copy"><SectionLabel>{current.label} / </SectionLabel><h1>{current.title}</h1><p>{current.dek}</p><Link className="story-link" href="/historias/vestirse-de-futuro">Explorar historias <ArrowUpRight size={16} /></Link></div><div className="subpage-hero__image"><img src={current.image} alt="" /><span>LIGHT / {current.label.toUpperCase()}</span></div></section><section className="subpage-intro"><p className="eyebrow">La edición</p><p>Una selección de historias para mirar con calma. Ideas, personas y objetos que hacen del estilo una forma de estar en el mundo.</p></section><section className="subpage-stories"><div className="subpage-stories__heading"><SectionLabel>Historias destacadas</SectionLabel><span>03 piezas editoriales</span></div><div className="subpage-stories__grid">{current.stories.map((story, index) => <Link className="subpage-story" href={index === 0 ? "/historias/vestirse-de-futuro" : "/archivo"} key={story}><div className="subpage-story__image"><img src={[current.image, images.detail, images.sociedad][index]} alt="" /><span>0{index + 1}</span></div><p className="eyebrow">{current.label}</p><h2>{story}</h2><span className="subpage-story__read">Leer historia <ArrowUpRight size={15} /></span></Link>)}</div></section><section className="subpage-marquee"><span>LIGHT</span><span>LIGHT</span><span>LIGHT</span></section></main><Footer /></div>;
}

export function ArchivePage() { return <SectionPage section="cultura" />; }
export function NewsletterPage() { return <div className="subpage-simple"><SectionPage section="sociedad" /></div>; }
