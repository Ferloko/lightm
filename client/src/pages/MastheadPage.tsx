import { UserRound } from "lucide-react";
import { usePageBanner } from "@/lib/pageBanners";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import EditorialPageLayout from "@/components/EditorialPageLayout";
import { defaultMastheadTeam, fetchMastheadTeam, onMastheadChange, type MastheadMember } from "@/lib/masthead";
import { safeImageUrl } from "@/lib/utils";

export default function MastheadPage() {
  const banner = usePageBanner("masthead");
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

  // Grouped by role, as in the LIGHT masthead; roles without people yet are left out.
  const staffed = team.filter((member) => member.people.length > 0);
  const peopleCount = staffed.reduce((total, member) => total + member.people.length, 0);

  return <EditorialPageLayout activePath="/masthead">
    <section className="masthead-hero" style={banner.custom ? { backgroundImage: `url(${JSON.stringify(banner.image)})`, backgroundPosition: banner.position } : undefined}>
      <p className="eyebrow">LIGHT / PEOPLE</p>
      <h1>Las personas<br /><em>detrás de la mirada.</em></h1>
      <p>El equipo que imagina, edita y acompaña las historias de LIGHT.</p>
      <span className="masthead-hero__edition">MASTHEAD / 2026</span>
    </section>
    <section className="masthead-grid-section" aria-labelledby="masthead-roster-title">
      <div className="masthead-grid__head">
        <div><p className="eyebrow">La revista / El equipo</p><h2 id="masthead-roster-title">Masthead</h2></div>
        <span>{loading ? "Actualizando equipo" : `${staffed.length} ${staffed.length === 1 ? "cargo" : "cargos"} · ${peopleCount} ${peopleCount === 1 ? "integrante" : "integrantes"}`}</span>
      </div>
      {staffed.length ? staffed.map((member, groupIndex) => <section className="mh-group" key={member.id} aria-labelledby={`mh-${member.id}`}>
        <header className="mh-group__head"><span className="mh-group__index">{String(groupIndex + 1).padStart(2, "0")}</span><h3 id={`mh-${member.id}`}>{member.role}</h3><small>{member.people.length} {member.people.length === 1 ? "persona" : "personas"}</small></header>
        <ul className="masthead-grid">{member.people.map((person, index) => { const image = safeImageUrl(person.image); return <li key={person.id} style={{ "--card-index": index } as CSSProperties}>
          <Link className="masthead-card" href={`/masthead/${person.slug}`} aria-label={`${person.name}, ${member.role}. Ver perfil`}>
            <span className="masthead-card__portrait">{image ? <img src={image} alt="" loading="lazy" /> : <span className="masthead-card__placeholder"><UserRound size={30} strokeWidth={1.1} /></span>}<span className="masthead-card__cta">Ver perfil</span></span>
            <span className="masthead-card__name">{person.name}</span>
            <span className="masthead-card__role">{member.role}</span>
            {person.tagline && <span className="masthead-card__tagline">{person.tagline}</span>}
          </Link>
        </li>; })}</ul>
      </section>) : <p className="masthead-grid__empty">Integrantes por presentar.</p>}
    </section>
    {staffed.length > 0 && <section className="mh-credits" aria-label="Créditos del masthead">
      <p className="eyebrow">LIGHT / Masthead {new Date().getFullYear()}</p>
      <div className="mh-credits__leads">{staffed.slice(0, 2).map((member) => <div key={member.id}><strong>{member.people.map((person) => person.name).join(", ")}</strong><span>{member.role}</span></div>)}</div>
      <div className="mh-credits__list">{staffed.slice(2).map((member) => <p key={member.id}><em>{member.role}:</em> {member.people.map((person) => <Link href={`/masthead/${person.slug}`} key={person.id}>{person.name}</Link>).reduce<React.ReactNode[]>((all, item, index) => index ? [...all, ", ", item] : [item], [])}</p>)}</div>
      <p className="masthead-roster__note">Una publicación se construye en equipo: con criterio, conversación y atención a cada detalle.</p>
    </section>}
  </EditorialPageLayout>;
}
