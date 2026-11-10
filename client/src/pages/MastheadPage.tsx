import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import EditorialPageLayout from "@/components/EditorialPageLayout";
import { defaultMastheadTeam, fetchMastheadTeam, onMastheadChange, type MastheadMember } from "@/lib/masthead";
import { safeImageUrl } from "@/lib/utils";

export default function MastheadPage() {
  const [team, setTeam] = useState<MastheadMember[]>(defaultMastheadTeam);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await fetchMastheadTeam();
        if (active) setTeam(next);
      } catch {
        if (active) setTeam(defaultMastheadTeam);
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const unsubscribe = onMastheadChange(() => { void refresh(); });
    return () => { active = false; unsubscribe(); };
  }, []);

  // One card per person, in masthead order, each with the role it belongs to.
  const people = team.flatMap((member) => member.people.map((person) => ({ person, role: member.role })));

  return <EditorialPageLayout activePath="/masthead">
    <section className="masthead-hero">
      <p className="eyebrow">LIGHT / PEOPLE</p>
      <h1>Las personas<br /><em>detrás de la mirada.</em></h1>
      <p>El equipo que imagina, edita y acompaña las historias de LIGHT.</p>
      <span className="masthead-hero__edition">MASTHEAD / 2026</span>
    </section>
    <section className="masthead-grid-section" aria-labelledby="masthead-roster-title">
      <div className="masthead-grid__head">
        <div><p className="eyebrow">La revista / El equipo</p><h2 id="masthead-roster-title">Masthead</h2></div>
        <span>{loading ? "Actualizando equipo" : `${people.length} ${people.length === 1 ? "integrante" : "integrantes"}`}</span>
      </div>
      {people.length ? <ul className="masthead-grid">
        {people.map(({ person, role }, index) => { const image = safeImageUrl(person.image); return <li key={person.id} style={{ "--card-index": index } as CSSProperties}>
          <Link className="masthead-card" href={`/masthead/${person.slug}`} aria-label={`${person.name}, ${role}. Ver perfil`}>
            <span className="masthead-card__portrait">{image ? <img src={image} alt="" loading="lazy" /> : <span className="masthead-card__placeholder"><UserRound size={30} strokeWidth={1.1} /></span>}</span>
            <span className="masthead-card__name">{person.name}</span>
            <span className="masthead-card__role">{role}</span>
          </Link>
        </li>; })}
      </ul> : <p className="masthead-grid__empty">Integrantes por presentar.</p>}
      <p className="masthead-roster__note">Una publicación se construye en equipo: con criterio, conversación y atención a cada detalle.</p>
    </section>
  </EditorialPageLayout>;
}
