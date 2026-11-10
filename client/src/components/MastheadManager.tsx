import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, ExternalLink, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { assignPersonSlugs, defaultMastheadTeam, emptyPersonDetails, fetchMastheadTeam, saveMastheadTeam, type MastheadMember, type MastheadPerson } from "@/lib/masthead";
import { describeError } from "@/lib/supabase";

function createId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newMember(): MastheadMember {
  return { id: createId("masthead"), role: "New position", people: [] };
}

function newPerson(): MastheadPerson {
  return { ...emptyPersonDetails(), id: createId("person"), name: "", image: "" };
}

function PersonDetailsEditor({ person, onChange }: { person: MastheadPerson; onChange: (patch: Partial<MastheadPerson>) => void }) {
  const facts = person.facts.length ? person.facts : [];
  return <div className="masthead-admin__details">
    <p className="masthead-admin__details-intro">Esta información forma la hoja propia de {person.name || "la persona"}{person.slug ? <> en <code>/masthead/{person.slug}</code></> : ""}. Todo es opcional.</p>
    <label><span>Frase corta bajo el nombre</span><input value={person.tagline} onChange={(event) => onChange({ tagline: event.target.value })} placeholder="Modelo de pasarela entre París y Ciudad de México" /></label>
    <label className="masthead-admin__details-wide"><span>Biografía (separa párrafos con una línea en blanco)</span><textarea rows={6} value={person.bio} onChange={(event) => onChange({ bio: event.target.value })} placeholder="Trayectoria, campañas, mirada…" /></label>
    <label><span>Ciudad / base</span><input value={person.location} onChange={(event) => onChange({ location: event.target.value })} placeholder="San Andreas, United States" /></label>
    <label><span>Agencia</span><input value={person.agency} onChange={(event) => onChange({ agency: event.target.value })} placeholder="LIGHT Talent" /></label>
    <label><span>Facebrowser (@usuario o URL)</span><input value={person.facebrowser} onChange={(event) => onChange({ facebrowser: event.target.value })} placeholder="@usuario" /></label>
    <label><span>Imagen principal de la hoja · URL https (9:16 recomendado)</span><input type="url" value={person.coverImage} onChange={(event) => onChange({ coverImage: event.target.value })} placeholder="Si se deja vacío, se usa el retrato" /></label>
    <label className="masthead-admin__details-wide"><span>Galería / book · una URL https por línea</span><textarea rows={4} value={person.gallery.join("\n")} onChange={(event) => onChange({ gallery: event.target.value.split("\n").map((line) => line.trim()) })} placeholder={"https://…\nhttps://…"} /></label>
    <div className="masthead-admin__details-wide masthead-admin__facts"><span>Datos (ej. Altura · 1,78 m, Ojos · Verdes, Temporadas · SS27)</span>
      {facts.map((fact, index) => <div className="masthead-admin__fact" key={index}><input aria-label="Dato" value={fact.label} onChange={(event) => onChange({ facts: facts.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} placeholder="Altura" /><input aria-label="Valor" value={fact.value} onChange={(event) => onChange({ facts: facts.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) })} placeholder="1,78 m" /><button type="button" className="admin-icon-button admin-icon-button--delete" onClick={() => onChange({ facts: facts.filter((_, itemIndex) => itemIndex !== index) })} aria-label="Quitar dato"><Trash2 size={14} /></button></div>)}
      <button type="button" className="admin-secondary" onClick={() => onChange({ facts: [...facts, { label: "", value: "" }] })}><Plus size={13} /> Añadir dato</button>
    </div>
  </div>;
}

export default function MastheadManager({ readOnly = false }: { readOnly?: boolean }) {
  const [openPerson, setOpenPerson] = useState<string | null>(null);
  const [members, setMembers] = useState<MastheadMember[]>(defaultMastheadTeam);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void fetchMastheadTeam().then((team) => { if (active) setMembers(team); }).catch(() => { if (active) setNotice("No se pudo leer Supabase; revisa la conexión antes de guardar."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateMember = (id: string, patch: Partial<MastheadMember>) => setMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  const updatePerson = (memberId: string, personId: string, patch: Partial<MastheadPerson>) => setMembers((current) => current.map((member) => member.id === memberId ? { ...member, people: member.people.map((person) => person.id === personId ? { ...person, ...patch } : person) } : member));
  const moveMember = (index: number, direction: -1 | 1) => setMembers((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });

  const save = async () => {
    const incomplete = members.some((member) => member.people.some((person) => !person.name.trim()));
    if (incomplete) { setNotice("Completa el nombre de cada integrante añadido o elimina su fila antes de guardar."); return; }
    const cleaned = assignPersonSlugs(members.map((member) => ({ ...member, role: member.role.trim(), people: member.people.map((person) => ({ ...person, name: person.name.trim(), image: person.image.trim(), coverImage: person.coverImage.trim(), gallery: person.gallery.map((item) => item.trim()).filter(Boolean), facts: person.facts.filter((fact) => fact.label.trim() && fact.value.trim()) })) })).filter((member) => member.role));
    if (!cleaned.length) { setNotice("Añade al menos un cargo antes de guardar."); return; }
    setSaving(true);
    setNotice("");
    try {
      const destination = await saveMastheadTeam(cleaned);
      setMembers(cleaned);
      setNotice(destination === "remote" ? "Masthead guardado en Supabase; los cambios ya están disponibles en la hoja pública." : "Masthead guardado en este navegador de demostración.");
    } catch (error) {
      setNotice(`No se pudo guardar Masthead: ${describeError(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return <section className="masthead-admin">
    <div className="admin-section-heading"><div><p>LIGHT / Equipo editorial</p><h2>Edita el Masthead.</h2></div><div className="admin-section-heading__actions"><Link className="admin-secondary" href="/masthead"><ExternalLink size={14} /> Ver hoja</Link>{!readOnly && <button className="admin-primary" type="button" onClick={() => void save()} disabled={saving || loading}><Save size={15} /> {saving ? "Guardando…" : "Guardar cambios"}</button>}</div></div>
    <p className="masthead-admin__intro">Edita cargos, nombres y retratos. Cada persona tiene su propia hoja pública: pulsa “Hoja propia” para escribir su biografía, datos, redes y galería, igual que una ficha de Runway. Los retratos se muestran en 9:16; usa URLs https.</p>
    <fieldset className="admin-fieldset" disabled={readOnly}>
    <div className="masthead-admin__list" aria-busy={loading || saving}>{members.map((member, index) => <article className="masthead-admin__row" key={member.id}>
      <div className="masthead-admin__role-head"><span className="masthead-admin__index">{String(index + 1).padStart(2, "0")}</span><label><span>Cargo</span><input value={member.role} onChange={(event) => updateMember(member.id, { role: event.target.value })} placeholder="Cargo editorial" /></label><div className="masthead-admin__actions"><button type="button" className="admin-icon-button" onClick={() => moveMember(index, -1)} disabled={index === 0} aria-label={`Mover ${member.role} arriba`}><ArrowUp size={15} /></button><button type="button" className="admin-icon-button" onClick={() => moveMember(index, 1)} disabled={index === members.length - 1} aria-label={`Mover ${member.role} abajo`}><ArrowDown size={15} /></button><button type="button" className="admin-icon-button admin-icon-button--delete" onClick={() => setMembers((current) => current.filter((item) => item.id !== member.id))} aria-label={`Quitar cargo ${member.role}`}><Trash2 size={15} /></button></div></div>
      <div className="masthead-admin__people"><div className="masthead-admin__people-head"><span>Integrantes · {member.people.length}</span><button className="admin-secondary" type="button" onClick={() => updateMember(member.id, { people: [...member.people, newPerson()] })}><Plus size={14} /> Añadir persona</button></div>
        {member.people.length ? <div className="masthead-admin__people-list">{member.people.map((person) => <div className="masthead-admin__person" key={person.id}>
          <div className="masthead-admin__avatar">{person.image ? <img src={person.image} alt="Vista previa del retrato" /> : <UserRound size={20} strokeWidth={1.2} />}</div>
          <label><span>Nombre y apellido</span><input value={person.name} onChange={(event) => updatePerson(member.id, person.id, { name: event.target.value })} placeholder="Nombre de la persona" /></label>
          <label><span>Retrato · URL https</span><input type="url" value={person.image} onChange={(event) => updatePerson(member.id, person.id, { image: event.target.value })} placeholder="https://…" /></label>
          <div className="masthead-admin__person-actions"><button type="button" className="admin-secondary" onClick={() => setOpenPerson((current) => current === person.id ? null : person.id)} aria-expanded={openPerson === person.id}>{openPerson === person.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Hoja propia</button>{person.slug && <a className="admin-icon-button" href={`/masthead/${person.slug}`} target="_blank" rel="noreferrer" aria-label={`Abrir la hoja de ${person.name}`}><ExternalLink size={14} /></a>}<button type="button" className="admin-icon-button admin-icon-button--delete" onClick={() => updateMember(member.id, { people: member.people.filter((item) => item.id !== person.id) })} aria-label={`Quitar a ${person.name || "esta persona"}`}><Trash2 size={15} /></button></div>
          {openPerson === person.id && <PersonDetailsEditor person={person} onChange={(patch) => updatePerson(member.id, person.id, patch)} />}
        </div>)}</div> : <p className="masthead-admin__people-empty">Aún no hay personas asignadas a este cargo.</p>}
      </div>
    </article>)}</div>
    </fieldset>
    <div className="masthead-admin__footer">{!readOnly && <button className="admin-secondary" type="button" onClick={() => setMembers((current) => [...current, newMember()])}><Plus size={15} /> Añadir cargo</button>}<span>{members.length} cargos · orden de arriba abajo</span></div>
    {notice && <p className="masthead-admin__notice" role="status">{notice}</p>}
  </section>;
}
