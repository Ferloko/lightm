import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import type { ComingSoonPage as ComingSoonConfig } from "@/lib/pageAvailability";

export default function ComingSoonPage({ page }: { page: ComingSoonConfig }) {
  return <main className="coming-soon-page"><div className="coming-soon-page__visual" style={{ backgroundImage: `url(${page.image})` }}><span>LIGHT / {page.label.toUpperCase()}</span></div><section className="coming-soon-page__copy"><Link className="coming-soon-page__back" href="/"><ArrowLeft size={15} /> Volver a LIGHT</Link><p className="eyebrow">{page.label} / Próximamente</p><h1>{page.title}</h1><p>{page.message}</p><div className="coming-soon-page__rule" /><span className="coming-soon-page__note">Estamos editando para mirar mejor.</span><Link className="story-link" href="/archivo">Explorar el archivo <ArrowUpRight size={16} /></Link></section></main>;
}
