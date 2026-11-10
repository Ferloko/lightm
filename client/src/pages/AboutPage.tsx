import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import EditorialPageLayout from "@/components/EditorialPageLayout";

const pillars: { number: string; title: string; body: string; href: string; cta: string }[] = [
  { number: "01", title: "Moda y Belleza", body: "Siluetas, oficios, rituales y gestos que definen cómo nos vemos y cómo queremos ser vistos.", href: "/moda", cta: "Leer Moda" },
  { number: "02", title: "Eventos y Living", body: "Los encuentros, los lugares y las formas de habitar que marcan el pulso de la temporada.", href: "/eventos", cta: "Ver Eventos" },
  { number: "03", title: "Runway", body: "Un directorio de casas y marcas para seguir de cerca lo que sube a la pasarela.", href: "/runway", cta: "Explorar Runway" },
  { number: "04", title: "La revista", body: "Ediciones digitales que reúnen cada número como una pieza para leer de principio a fin.", href: "/sobre-moda", cta: "Ver ediciones" },
];

const principles: { title: string; body: string }[] = [
  { title: "Criterio", body: "Elegimos menos y miramos mejor. Cada historia tiene que ganarse su lugar en la página." },
  { title: "Curiosidad", body: "Preguntamos antes de afirmar. Nos interesa lo que empieza, no solo lo que ya es tendencia." },
  { title: "Cuidado", body: "Con las imágenes, con las palabras y con las personas que aparecen en ellas." },
];

export default function AboutPage() {
  useEffect(() => { document.title = "About Us — LIGHT"; return () => { document.title = "LIGHT — Revista de estilo"; }; }, []);
  return <EditorialPageLayout activePath="/about">
    <section className="about-hero">
      <p className="eyebrow">LIGHT / About Us</p>
      <h1>Antes de que esté de moda, <em>está en LIGHT.</em></h1>
      <div className="about-hero__foot"><p>LIGHT es una revista digital sobre estilo, belleza, cultura y las ideas que mueven la conversación.</p><span>About Us</span></div>
    </section>

    <section className="about-manifesto">
      <p className="eyebrow">Manifiesto</p>
      <p className="about-manifesto__text">Creemos que la moda es una forma de leer el presente. Por eso hacemos una revista que mira despacio: que encuentra la historia detrás de una prenda, el oficio detrás de una imagen y la conversación detrás de cada temporada.</p>
    </section>

    <section className="about-pillars" aria-labelledby="about-pillars-title">
      <div className="about-section-head"><p className="eyebrow">Lo que hacemos</p><h2 id="about-pillars-title">Cuatro maneras de mirar.</h2></div>
      <div className="about-pillars__grid">{pillars.map((pillar) => <Link className="about-pillar" href={pillar.href} key={pillar.number}><span className="about-pillar__number">{pillar.number}</span><h3>{pillar.title}</h3><p>{pillar.body}</p><span className="about-pillar__cta">{pillar.cta} <ArrowUpRight size={14} /></span></Link>)}</div>
    </section>

    <section className="about-principles" aria-labelledby="about-principles-title">
      <div className="about-section-head"><p className="eyebrow">Cómo trabajamos</p><h2 id="about-principles-title">Lo que no negociamos.</h2></div>
      <ol className="about-principles__list">{principles.map((principle, index) => <li key={principle.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{principle.title}</h3><p>{principle.body}</p></li>)}</ol>
    </section>

    <section className="about-cta">
      <Link className="about-cta__card" href="/masthead"><p className="eyebrow">El equipo</p><h3>Las personas detrás de la mirada.</h3><span>Conocer el Masthead <ArrowUpRight size={15} /></span></Link>
      <Link className="about-cta__card about-cta__card--dark" href="/business"><p className="eyebrow">Business</p><h3>Colaboraciones y proyectos con LIGHT.</h3><span>Hablar con nosotros <ArrowUpRight size={15} /></span></Link>
    </section>
  </EditorialPageLayout>;
}
