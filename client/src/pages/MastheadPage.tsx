import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import EditorialPageLayout from "@/components/EditorialPageLayout";
import { defaultMastheadTeam, fetchMastheadTeam, mastheadTeamEventName, type MastheadMember } from "@/lib/masthead";

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
    window.addEventListener(mastheadTeamEventName, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      window.removeEventListener(mastheadTeamEventName, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return <EditorialPageLayout activePath="/masthead">
    <section className="masthead-hero">
      <p className="eyebrow">LIGHT / PEOPLE</p>
      <h1>Las personas<br /><em>detrás de la mirada.</em></h1>
      <p>El equipo que imagina, edita y acompaña las historias de LIGHT.</p>
      <span className="masthead-hero__edition">MASTHEAD / 2026</span>
    </section>
    <section className="masthead-roster" aria-labelledby="masthead-roster-title">
      <div className="masthead-roster__head">
        <div><p className="eyebrow">La revista / El equipo</p><h2 id="masthead-roster-title">Masthead</h2></div>
        <span>{loading ? "Actualizando equipo" : `${team.length} cargos`}</span>
      </div>
      <ol className="masthead-roster__list">
        {team.map((member, index) => <li className="masthead-roster__member" key={member.id}>
          <div className="masthead-roster__role">
            <span className="masthead-roster__number">{String(index + 1).padStart(2, "0")}</span>
            <p className="eyebrow">LIGHT / TEAM</p>
            <h3>{member.role}</h3>
          </div>
          {member.people.length ? <div className="masthead-people" aria-label={`Integrantes: ${member.role}`}>
            {member.people.map((person) => <figure className="masthead-person" key={person.id}>
              <div className="masthead-person__portrait">{person.image ? <img src={person.image} alt={`Retrato de ${person.name}`} loading="lazy" /> : <div className="masthead-person__placeholder"><UserRound size={27} strokeWidth={1.2} /><span>LIGHT</span></div>}</div>
              <figcaption>{person.name}</figcaption>
            </figure>)}
          </div> : <p className="masthead-roster__empty">Integrantes por presentar.</p>}
        </li>)}
      </ol>
      <p className="masthead-roster__note">Una publicación se construye en equipo: con criterio, conversación y atención a cada detalle.</p>
    </section>
  </EditorialPageLayout>;
}
