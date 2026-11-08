import { ArrowDown, ArrowUp, ExternalLink, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { defaultMastheadTeam, fetchMastheadTeam, saveMastheadTeam, type MastheadMember, type MastheadPerson } from "@/lib/masthead";

function createId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newMember(): MastheadMember {
  return { id: createId("masthead"), role: "New position", people: [] };
}

function newPerson(): MastheadPerson {
  return { id: createId("person"), name: "", image: "" };
}

export default function MastheadManager() {
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
    const cleaned = members.map((member) => ({ ...member, role: member.role.trim(), people: member.people.map((person) => ({ ...person, name: person.name.trim(), image: person.image.trim() })) })).filter((member) => member.role);
    if (!cleaned.length) { setNotice("Añade al menos un cargo antes de guardar."); return; }
    setSaving(true);
    setNotice("");
    try {
      const destination = await saveMastheadTeam(cleaned);
      setMembers(cleaned);
      setNotice(destination === "remote" ? "Masthead guardado en Supabase; los cambios ya están disponibles en la hoja pública." : "Masthead guardado en este navegador de demostración.");
    } catch (error) {
      setNotice(`No se pudo guardar Masthead: ${error instanceof Error ? error.message : "error desconocido"}`);
    } finally {
      setSaving(false);
    }
  };

  return <section className="masthead-admin">
    <div className="admin-section-heading"><div><p>LIGHT / Equipo editorial</p><h2>Edita el Masthead.</h2></div><div className="admin-section-heading__actions"><Link className="admin-secondary" href="/masthead"><ExternalLink size={14} /> Ver hoja</Link><button className="admin-primary" type="button" onClick={() => void save()} disabled={saving || loading}><Save size={15} /> {saving ? "Guardando…" : "Guardar cambios"}</button></div></div>
    <p className="masthead-admin__intro">Edita cargos, nombres y retratos. Cada cargo admite varias personas: se mostrarán en horizontal y pasarán a la siguiente fila cuando no quepan. Las fotos se añaden mediante una URL https.</p>
    <div className="masthead-admin__list" aria-busy={loading || saving}>{members.map((member, index) => <article className="masthead-admin__row" key={member.id}>
      <div className="masthead-admin__role-head"><span className="masthead-admin__index">{String(index + 1).padStart(2, "0")}</span><label><span>Cargo</span><input value={member.role} onChange={(event) => updateMember(member.id, { role: event.target.value })} placeholder="Cargo editorial" /></label><div className="masthead-admin__actions"><button type="button" className="admin-icon-button" onClick={() => moveMember(index, -1)} disabled={index === 0} aria-label={`Mover ${member.role} arriba`}><ArrowUp size={15} /></button><button type="button" className="admin-icon-button" onClick={() => moveMember(index, 1)} disabled={index === members.length - 1} aria-label={`Mover ${member.role} abajo`}><ArrowDown size={15} /></button><button type="button" className="admin-icon-button admin-icon-button--delete" onClick={() => setMembers((current) => current.filter((item) => item.id !== member.id))} aria-label={`Quitar cargo ${member.role}`}><Trash2 size={15} /></button></div></div>
      <div className="masthead-admin__people"><div className="masthead-admin__people-head"><span>Integrantes · {member.people.length}</span><button className="admin-secondary" type="button" onClick={() => updateMember(member.id, { people: [...member.people, newPerson()] })}><Plus size={14} /> Añadir persona</button></div>
        {member.people.length ? <div className="masthead-admin__people-list">{member.people.map((person) => <div className="masthead-admin__person" key={person.id}>
          <div className="masthead-admin__avatar">{person.image ? <img src={person.image} alt="Vista previa del retrato" /> : <UserRound size={20} strokeWidth={1.2} />}</div>
          <label><span>Nombre y apellido</span><input value={person.name} onChange={(event) => updatePerson(member.id, person.id, { name: event.target.value })} placeholder="Nombre de la persona" /></label>
          <label><span>Retrato · URL https</span><input type="url" value={person.image} onChange={(event) => updatePerson(member.id, person.id, { image: event.target.value })} placeholder="https://…" /></label>
          <button type="button" className="admin-icon-button admin-icon-button--delete" onClick={() => updateMember(member.id, { people: member.people.filter((item) => item.id !== person.id) })} aria-label={`Quitar a ${person.name || "esta persona"}`}><Trash2 size={15} /></button>
        </div>)}</div> : <p className="masthead-admin__people-empty">Aún no hay personas asignadas a este cargo.</p>}
      </div>
    </article>)}</div>
    <div className="masthead-admin__footer"><button className="admin-secondary" type="button" onClick={() => setMembers((current) => [...current, newMember()])}><Plus size={15} /> Añadir cargo</button><span>{members.length} cargos · orden de arriba abajo</span></div>
    {notice && <p className="masthead-admin__notice" role="status">{notice}</p>}
  </section>;
}
