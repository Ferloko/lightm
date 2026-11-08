import MenuThemeToggle from "@/components/MenuThemeToggle";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { SiteFooter } from "@/components/EditorialPageLayout";

const destinations = [
  { place: "Mallorca", label: "Mediterráneo", title: "La calma también es un destino.", image: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1200&q=90" },
  { place: "Kyoto", label: "Japón", title: "El ritual de hacer una pausa.", image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=90" },
  { place: "Comporta", label: "Portugal", title: "Días largos, objetos esenciales.", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=90" },
  { place: "Oaxaca", label: "México", title: "Una ciudad que se descubre a pie.", image: "/images/living-oaxaca-street.jpg" },
  { place: "Alentejo", label: "Portugal", title: "Un horizonte hecho de pausas.", image: "/images/living-alentejo-field.jpg" },
];

const activities = [
  { number: "01", title: "Comer despacio", text: "Mesas que convierten el paisaje en parte de la conversación.", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=90" },
  { number: "02", title: "Dormir mejor", text: "Habitaciones pensadas para bajar el ritmo y mirar la luz.", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=90" },
  { number: "03", title: "Llegar a otro sitio", text: "Escapadas que empiezan mucho antes del check-in.", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=90" },
];



export default function LivingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="site-shell living-page">
    <header className="site-header"><div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.4} /><span>Menú</span></button><p>La conversación de estilo, sin concesiones.</p><button className="header-action" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></div><div className="brand-row"><Link href="/" className="wordmark" aria-label="LIGHT inicio">LIGHT</Link></div><nav className="main-nav" aria-label="Navegación principal"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link className="nav-active" href="/living">Living</Link><Link href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav></header>
    {menuOpen && <div className="menu-overlay" role="dialog" aria-modal="true" aria-label="Menú de navegación"><div className="menu-overlay__top"><span className="menu-overlay__edition">LIGHT</span><MenuThemeToggle /><button className="close-button" type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={22} /></button></div><div className="menu-overlay__inner"><p className="eyebrow">Explora la revista</p><div className="menu-overlay__links">{[["Inicio", "/"], ["Moda", "/moda"], ["Belleza", "/belleza"], ["Eventos", "/eventos"], ["Living", "/living"], ["Runway", "/runway"], ["Masthead", "/masthead"], ["Business", "/business"], ["La revista", "/sobre-moda"], ["Archivo", "/archivo"]].map(([label, href], index) => <Link href={href} key={label} onClick={() => setMenuOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span>{label}<ArrowUpRight size={22} /></Link>)}</div><p className="menu-overlay__note">Historias para vivir más despacio.</p></div></div>}
    <main>
      <section className="living-hero"><div className="living-hero__image"><img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=90" alt="Resort junto al mar" /><span>LIVING / THE ESCAPE ISSUE</span></div><div className="living-hero__copy"><p className="eyebrow">LIGHT / LIVING</p><h1>El arte<br /><em>de llegar.</em></h1><p>Resorts, casas, mesas y pequeños rituales para descubrir otra manera de estar en el mundo.</p><Link className="living-hero__link" href="#destinos">Explorar la selección <ArrowUpRight size={16} /></Link></div></section>
      <section className="living-intro"><p className="eyebrow">Una guía para salir de la rutina</p><h2>Hay lugares que no se visitan.<br /><em>Se quedan contigo.</em></h2><p>Living reúne destinos, hoteles y experiencias que merecen una pausa. Una hoja para elegir el próximo paisaje, la próxima mesa y la próxima conversación.</p></section>
      <section className="living-destinations" id="destinos"><div className="living-section-head"><div><p className="eyebrow">Destinos / 01</p><h2>Donde empieza el descanso.</h2></div><span>05 lugares para mirar distinto</span></div><div className="living-destination-grid">{destinations.map((item, index) => <article className={`living-destination living-destination--${index + 1}`} key={item.place}><div className="living-destination__image"><img src={item.image} alt={item.place} /><span className="image-hover-overlay"><strong>{item.title}</strong></span></div><div className="living-destination__meta"><span>{item.label}</span><h3>{item.place}</h3></div></article>)}</div><aside className="living-destinations__note"><p className="eyebrow">El ritmo también es un destino</p><p>Deja espacio para lo imprevisto: una mesa compartida, un desvío y una mañana sin agenda.</p></aside></section>
      <section className="living-activities"><div className="living-section-head"><div><p className="eyebrow">The living list / 02</p><h2>Lo que haremos allí.</h2></div><span>Pequeños planes, grandes días</span></div><div className="living-activities__list">{activities.map((item) => <article className="living-activity" key={item.number}><span className="living-activity__number">{item.number}</span><div className="living-activity__image"><img src={item.image} alt="" /></div><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div></section>
      <section className="living-events"><div className="living-events__intro"><p className="eyebrow">Agenda / 03</p><h2>Eventos para cambiar de aire.</h2><p>Conversaciones, arte y escapadas que convierten un fin de semana en una historia.</p><Link className="living-hero__link" href="/eventos">Ver la cobertura de Eventos <ArrowUpRight size={16} /></Link></div><div className="living-events__list"><article><span>12—15 JUN</span><div><h3>Casa LIGHT / Mallorca</h3><p>Cuatro días de cocina, cerámica y mar.</p></div><ArrowUpRight size={18} /></article><article><span>04—07 SEP</span><div><h3>Open Rooms / Kyoto</h3><p>Arquitectura, jardines y el ritual del té.</p></div><ArrowUpRight size={18} /></article><article><span>21 OCT</span><div><h3>Una mesa larga / Madrid</h3><p>Una cena para cerrar la temporada.</p></div><ArrowUpRight size={18} /></article></div></section>
    </main>
    <SiteFooter />
  </div>;
}
