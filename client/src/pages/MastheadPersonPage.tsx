import { ArrowLeft, ArrowUpRight, Globe, MapPin, UserRound } from "lucide-react";
import { facebrowserLabel, facebrowserProfileUrl } from "@/lib/facebrowser";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import EditorialPageLayout from "@/components/EditorialPageLayout";
import { fetchMastheadTeam, findMastheadPerson, onMastheadChange, type MastheadMember } from "@/lib/masthead";
import { safeHref, safeImageUrl } from "@/lib/utils";
import { PageSkeleton } from "@/components/EditorialSkeleton";
import ImageLightbox, { type LightboxImage } from "@/components/ImageLightbox";


/** Individual page of a Masthead person: model, editor or team member. */
export default function MastheadPersonPage() {
  const [, params] = useRoute<{ slug: string }>("/masthead/:slug");
  const [team, setTeam] = useState<MastheadMember[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => { void fetchMastheadTeam().then((next) => { if (active) setTeam(next); }).catch(() => { if (active) setTeam([]); }); };
    refresh();
    const unsubscribe = onMastheadChange(refresh);
    return () => { active = false; unsubscribe(); };
  }, []);

  const found = team && params?.slug ? findMastheadPerson(team, decodeURIComponent(params.slug)) : null;
  useEffect(() => { if (found) document.title = `${found.person.name} — LIGHT Masthead`; return () => { document.title = "LIGHT — Revista de estilo"; }; }, [found?.person.name]);

  if (!team) return <EditorialPageLayout activePath="/masthead"><PageSkeleton label="Cargando perfil" /></EditorialPageLayout>;
  if (!found) return <EditorialPageLayout activePath="/masthead"><section className="person-page person-page--missing"><p className="eyebrow">LIGHT / Masthead</p><h1>Este perfil no existe.</h1><Link href="/masthead" className="story-link">Volver al Masthead <ArrowUpRight size={15} /></Link></section></EditorialPageLayout>;

  const { member, person } = found;
  const portrait = safeImageUrl(person.image);
  const cover = safeImageUrl(person.coverImage) || portrait;
  const gallery = person.gallery.map(safeImageUrl).filter(Boolean);
  const facebrowser = facebrowserProfileUrl(person.facebrowser);
  const colleagues = member.people.filter((item) => item.id !== person.id);
  // Everything the viewer can show: the portrait first, then the book (without repeating the portrait).
  const viewerImages: LightboxImage[] = [...(cover ? [{ src: cover, alt: `Retrato de ${person.name}`, caption: `${person.name} · ${member.role}` }] : []), ...gallery.filter((image) => image !== cover).map((image, index) => ({ src: image, alt: `${person.name}, imagen ${index + 1}`, caption: `${person.name} · Book` }))];
  const openViewer = (src: string) => setViewerIndex(Math.max(0, viewerImages.findIndex((image) => image.src === src)));
  const paragraphs = person.bio.split(/\n{2,}|\r\n\r\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return <EditorialPageLayout activePath="/masthead">
    <article className="person-page">
      <div className="person-page__breadcrumb"><Link href="/masthead"><ArrowLeft size={14} /> Masthead</Link><span>LIGHT / {member.role}</span></div>
      <header className="person-hero">
        <div className="person-hero__copy">
          <p className="eyebrow">{member.role}</p>
          <h1>{person.name}</h1>
          {person.tagline && <p className="person-hero__tagline">{person.tagline}</p>}
          <dl className="person-hero__meta">
            {person.location && <div><dt>Base</dt><dd><MapPin size={13} /> {person.location}</dd></div>}
            {person.agency && <div><dt>Agencia</dt><dd>{person.agency}</dd></div>}
            {person.facts.filter((fact) => fact.label.trim() && fact.value.trim()).map((fact, index) => <div key={`${fact.label}-${index}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          </dl>
          {person.facebrowser.trim() && (facebrowser ? <a className="person-hero__social" href={facebrowser} target="_blank" rel="noreferrer"><Globe size={15} /> Facebrowser · {facebrowserLabel(person.facebrowser)}</a> : <span className="person-hero__social"><Globe size={15} /> Facebrowser · {facebrowserLabel(person.facebrowser)}</span>)}
        </div>
        <figure className="person-hero__portrait">{cover ? <button type="button" className="lightbox-trigger" onClick={() => openViewer(cover)} aria-label={`Ver en grande el retrato de ${person.name}`}><img src={cover} alt={`Retrato de ${person.name}`} /></button> : <div className="masthead-person__placeholder"><UserRound size={40} strokeWidth={1.1} /><span>LIGHT</span></div>}<figcaption>LIGHT / {member.role.toUpperCase()}</figcaption></figure>
      </header>

      {paragraphs.length > 0 && <section className="person-bio"><p className="eyebrow">Perfil</p><div>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>}

      {gallery.length > 0 && <section className="person-gallery" aria-label={`Galería de ${person.name}`}><div className="person-gallery__head"><p className="eyebrow">Book</p><span>{gallery.length} imágenes</span></div><div className="person-gallery__grid">{gallery.map((image, index) => <figure key={`${image}-${index}`}><button type="button" className="lightbox-trigger" onClick={() => openViewer(image)} aria-label={`Ver en grande la imagen ${index + 1}`}><img src={image} alt={`${person.name}, imagen ${index + 1}`} loading="lazy" /></button></figure>)}</div></section>}

      {colleagues.length > 0 && <section className="person-colleagues"><p className="eyebrow">También en {member.role}</p><div className="masthead-people">{colleagues.map((item) => { const image = safeImageUrl(item.image); return <Link className="masthead-person" key={item.id} href={`/masthead/${item.slug}`}><div className="masthead-person__portrait">{image ? <img src={image} alt={`Retrato de ${item.name}`} loading="lazy" /> : <div className="masthead-person__placeholder"><UserRound size={27} strokeWidth={1.2} /><span>LIGHT</span></div>}<span className="masthead-person__cta">Ver perfil <ArrowUpRight size={13} /></span></div><span className="masthead-person__name">{item.name}</span></Link>; })}</div></section>}

      <div className="person-page__end"><Link href="/masthead" className="story-link">Todo el equipo <ArrowUpRight size={15} /></Link></div>
    </article>
    {viewerIndex !== null && viewerImages.length > 0 && <ImageLightbox images={viewerImages} index={Math.min(viewerIndex, viewerImages.length - 1)} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} />}
  </EditorialPageLayout>;
}
