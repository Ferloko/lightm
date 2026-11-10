import { ArrowUpRight, MessageCircle } from "lucide-react";
import ContactSubmissionForm from "@/components/ContactSubmissionForm";
import EditorialPageLayout from "@/components/EditorialPageLayout";
import HeroArt from "@/components/HeroArt";

const opportunities = [
  { number: "01", title: "Historias de marca", copy: "Ideas desarrolladas con sensibilidad editorial y una voz propia." },
  { number: "02", title: "Presencia y colaboración", copy: "Formatos editoriales y digitales pensados en diálogo con LIGHT." },
  { number: "03", title: "Encuentros y experiencias", copy: "Activaciones que acercan personas, cultura y conversación." },
];

export default function BusinessPage() {
  return <EditorialPageLayout activePath="/business">
    <section className="business-hero business-hero--art">
      <div className="business-hero__copy">
        <p className="eyebrow">LIGHT / BUSINESS</p>
        <h1>Ideas que<br /><em>se encuentran.</em></h1>
        <p>Colaboraciones para marcas que comparten una mirada curiosa, contemporánea y cultural.</p>
        <a className="business-hero__contact" href="#colaboraciones">Conversar con LIGHT <ArrowUpRight size={16} /></a>
      </div>
      <HeroArt src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1400&q=85" caption="Partnerships / Editorial / Experiences" />
    </section>
    <section className="business-intro"><p className="eyebrow">Una plataforma, distintas conversaciones</p><h2>La colaboración empieza por una buena idea.</h2><p>LIGHT trabaja con marcas y organizaciones en propuestas que respetan su identidad y el punto de vista editorial de la revista. Cada proyecto se conversa y se construye a medida.</p></section>
    <section className="business-opportunities"><div className="business-opportunities__head"><div><p className="eyebrow">Formas de encontrarnos</p><h2>Lo que podemos<br /><em>imaginar juntos.</em></h2></div><span>PARTNERSHIPS / LIGHT</span></div><div className="business-opportunities__grid">{opportunities.map((item) => <article className="business-opportunity" key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div><div className="business-contact"><MessageCircle size={20} /><p>¿Tienes una propuesta para LIGHT?</p><a href="#colaboraciones">Abrir conversación <ArrowUpRight size={15} /></a></div></section>
    <ContactSubmissionForm />
  </EditorialPageLayout>;
}
