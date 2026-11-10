import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ExternalLink, Plus, RotateCcw, Save, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { assignPersonSlugs, defaultMastheadTeam, emptyPersonDetails, fetchMastheadTeam, saveMastheadTeam, type MastheadMember, type MastheadPerson } from "@/lib/masthead";
import { describeError } from "@/lib/supabase";
import { safeImageUrl } from "@/lib/utils";
import { ImageUrlFrame, InlineText } from "@/components/InlineEditing";

function createId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
const newMember = (): MastheadMember => ({ id: createId("masthead"), role: "Nuevo cargo", people: [] });
const newPerson = (): MastheadPerson => ({ ...emptyPersonDetails(), id: createId("person"), name: "", image: "" });
type Selection = { memberId: string; personId: string } | null;

/** Galería de la hoja propia: miniaturas con su URL, quitar y añadir. */
function GalleryEditor({ images, onChange, readOnly }: { images: string[]; onChange: (images: string[]) => void; readOnly: boolean }) {
  const [draft, setDraft] = useState("");
  const add = () => { const url = draft.trim(); if (!url) return; onChange([...images, url]); setDraft(""); };
  return <div className="masthead-panel__gallery">
    <div className="masthead-panel__gallery-grid">{images.map((src, index) => <figure key={`${src}-${index}`}>{safeImageUrl(src) ? <img src={safeImageUrl(src)} alt="" /> : <span>URL no válida</span>}{!readOnly && <button type="button" onClick={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))} aria-label="Quitar imagen"><X size={12} /></button>}</figure>)}</div>
    {!readOnly && <div className="masthead-panel__inline-add"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder="Pega la URL de una imagen y pulsa Enter" /><button type="button" onClick={add} aria-label="Añadir imagen"><Plus size={14} /></button></div>}
  </div>;
}

export default function MastheadManager({ readOnly = false }: { readOnly?: boolean }) {
  const [members, setMembers] = useState<MastheadMember[]>(defaultMastheadTeam);
  const [saved, setSaved] = useState<MastheadMember[]>(defaultMastheadTeam);
  const [selected, setSelected] = useState<Selection>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void fetchMastheadTeam().then((team) => { if (active) { setMembers(team); setSaved(team); } }).catch(() => { if (active) setNotice("No se pudo leer Supabase; revisa la conexión antes de guardar."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const dirty = JSON.stringify(members) !== JSON.stringify(saved);
  const updateMember = (id: string, patch: Partial<MastheadMember>) => setMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  const updatePerson = (memberId: string, personId: string, patch: Partial<MastheadPerson>) => setMembers((current) => current.map((member) => member.id === memberId ? { ...member, people: member.people.map((person) => person.id === personId ? { ...person, ...patch } : person) } : member));
  const moveMember = (index: number, direction: -1 | 1) => setMembers((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const removeMember = (member: MastheadMember) => { if (member.people.length && !window.confirm(`“${member.role}” tiene ${member.people.length} ${member.people.length === 1 ? "persona" : "personas"}. ¿Quitar el cargo con todas?`)) return; setMembers((current) => current.filter((item) => item.id !== member.id)); if (selected?.memberId === member.id) setSelected(null); };
  const addPerson = (memberId: string) => { const person = newPerson(); setMembers((current) => current.map((member) => member.id === memberId ? { ...member, people: [...member.people, person] } : member)); setSelected({ memberId, personId: person.id }); };
  const addMember = () => setMembers((current) => [...current, newMember()]);

  const current = selected ? (() => { const member = members.find((item) => item.id === selected.memberId); const index = member?.people.findIndex((person) => person.id === selected.personId) ?? -1; return member && index >= 0 ? { member, person: member.people[index], index } : null; })() : null;
  const removePerson = () => { if (!current) return; if (!window.confirm(`¿Quitar a ${current.person.name || "esta persona"} del Masthead?`)) return; updateMember(current.member.id, { people: current.member.people.filter((person) => person.id !== current.person.id) }); setSelected(null); };
  const movePersonWithin = (direction: -1 | 1) => { if (!current) return; const target = current.index + direction; if (target < 0 || target >= current.member.people.length) return; const people = [...current.member.people]; [people[current.index], people[target]] = [people[target], people[current.index]]; updateMember(current.member.id, { people }); };
  const changeRole = (memberId: string) => {
    if (!current || memberId === current.member.id) return;
    const person = current.person;
    setMembers((list) => list.map((member) => member.id === current.member.id ? { ...member, people: member.people.filter((item) => item.id !== person.id) } : member.id === memberId ? { ...member, people: [...member.people, person] } : member));
    setSelected({ memberId, personId: person.id });
  };

  const save = async () => {
    const unnamed = members.flatMap((member) => member.people.filter((person) => !person.name.trim()).map((person) => ({ member, person })));
    if (unnamed.length) { setSelected({ memberId: unnamed[0].member.id, personId: unnamed[0].person.id }); setNotice("Escribe el nombre de cada persona (está seleccionada la que falta) o quítala antes de guardar."); return; }
    const cleaned = assignPersonSlugs(members.map((member) => ({ ...member, role: member.role.trim(), people: member.people.map((person) => ({ ...person, name: person.name.trim(), image: person.image.trim(), coverImage: person.coverImage.trim(), gallery: person.gallery.map((item) => item.trim()).filter(Boolean), facts: person.facts.filter((fact) => fact.label.trim() && fact.value.trim()) })) })).filter((member) => member.role));
    if (!cleaned.length) { setNotice("Añade al menos un cargo antes de guardar."); return; }
    setSaving(true); setNotice("");
    try {
      const destination = await saveMastheadTeam(cleaned);
      setMembers(cleaned); setSaved(cleaned);
      setNotice(destination === "remote" ? "Masthead guardado. Los cambios ya están en la hoja pública." : "Masthead guardado en este navegador de demostración.");
    } catch (error) { setNotice(`No se pudo guardar el Masthead: ${describeError(error)}`); }
    finally { setSaving(false); }
  };

  const peopleCount = members.reduce((total, member) => total + member.people.length, 0);

  return <section className="wysiwyg-manager masthead-studio">
    <header className="wysiwyg-toolbar">
      <div><p className="eyebrow">LIGHT / Equipo editorial</p><h2>Masthead.</h2></div>
      <div className="wysiwyg-toolbar__actions">
        <a className="admin-secondary" href="/masthead" target="_blank" rel="noreferrer"><ExternalLink size={13} /> Ver hoja</a>
        {!readOnly && <button type="button" className="admin-secondary" onClick={() => { setMembers(saved); setSelected(null); }} disabled={!dirty}><RotateCcw size={14} /> Descartar</button>}
        {!readOnly && <button type="button" className="admin-primary" onClick={() => void save()} disabled={saving || loading || !dirty}><Save size={15} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>}
      </div>
    </header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <p className="wysiwyg-hint">{members.length} cargos · {peopleCount} {peopleCount === 1 ? "persona" : "personas"}. Escribe sobre el nombre de un cargo para cambiarlo, pulsa un retrato para editar a esa persona o “+” para añadir a alguien.</p>

    <div className="masthead-studio__layout" aria-busy={loading || saving}>
      <div className="masthead-studio__roster">
        {members.map((member, index) => <section className="masthead-studio__group" key={member.id}>
          <header>
            <span className="masthead-studio__index">{String(index + 1).padStart(2, "0")}</span>
            <h3><InlineText value={member.role} onChange={(role) => updateMember(member.id, { role })} placeholder="Nombre del cargo" readOnly={readOnly} ariaLabel={`Cargo ${index + 1}`} /></h3>
            {!readOnly && <div className="masthead-studio__group-actions"><button type="button" onClick={() => moveMember(index, -1)} disabled={index === 0} aria-label={`Subir ${member.role}`}><ArrowUp size={13} /></button><button type="button" onClick={() => moveMember(index, 1)} disabled={index === members.length - 1} aria-label={`Bajar ${member.role}`}><ArrowDown size={13} /></button><button type="button" onClick={() => removeMember(member)} aria-label={`Quitar cargo ${member.role}`}><Trash2 size={13} /></button></div>}
          </header>
          <div className="masthead-studio__people">
            {member.people.map((person) => {
              const isSelected = selected?.personId === person.id;
              const src = safeImageUrl(person.image);
              return <button type="button" key={person.id} className={`masthead-studio__card${isSelected ? " is-selected" : ""}`} onClick={() => setSelected(isSelected ? null : { memberId: member.id, personId: person.id })} aria-pressed={isSelected}>
                <span className="masthead-studio__portrait">{src ? <img src={src} alt="" /> : <UserRound size={26} strokeWidth={1} />}</span>
                <strong>{person.name || <em>Sin nombre</em>}</strong>
              </button>;
            })}
            {!readOnly && <button type="button" className="masthead-studio__card masthead-studio__card--add" onClick={() => addPerson(member.id)} aria-label={`Añadir persona a ${member.role}`}><span className="masthead-studio__portrait"><Plus size={22} strokeWidth={1.3} /></span><strong>Añadir</strong></button>}
          </div>
        </section>)}
        {!readOnly && <button type="button" className="masthead-studio__add-role" onClick={addMember}><Plus size={15} /> Añadir cargo</button>}
      </div>

      <aside className="masthead-panel" aria-label="Ficha de la persona">
        {current ? <fieldset className="admin-fieldset masthead-panel__body" disabled={readOnly}>
          <div className="masthead-panel__head">
            <ImageUrlFrame className="masthead-panel__portrait" src={current.person.image} onChange={(image) => updatePerson(current.member.id, current.person.id, { image })} emptyLabel="Clic para añadir el retrato (9:16)" readOnly={readOnly} />
            <div>
              <p className="eyebrow">Ficha</p>
              <h3><InlineText multiline value={current.person.name} onChange={(name) => updatePerson(current.member.id, current.person.id, { name })} placeholder="Nombre y apellido" readOnly={readOnly} ariaLabel="Nombre y apellido" /></h3>
              <label>Cargo<select value={current.member.id} onChange={(event) => changeRole(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.role || "Sin nombre"}</option>)}</select></label>
              <div className="masthead-panel__order"><button type="button" onClick={() => movePersonWithin(-1)} disabled={current.index === 0} aria-label="Mover antes"><ArrowLeft size={13} /></button><span>{current.index + 1} de {current.member.people.length}</span><button type="button" onClick={() => movePersonWithin(1)} disabled={current.index === current.member.people.length - 1} aria-label="Mover después"><ArrowRight size={13} /></button></div>
            </div>
          </div>

          <p className="masthead-panel__section">Hoja propia {current.person.slug ? <a href={`/masthead/${current.person.slug}`} target="_blank" rel="noreferrer">/masthead/{current.person.slug} <ExternalLink size={11} /></a> : <small>La URL se crea al guardar</small>}</p>
          <label>Frase bajo el nombre<input value={current.person.tagline} onChange={(event) => updatePerson(current.member.id, current.person.id, { tagline: event.target.value })} placeholder="Modelo de pasarela en San Andreas" /></label>
          <label>Biografía<textarea rows={6} value={current.person.bio} onChange={(event) => updatePerson(current.member.id, current.person.id, { bio: event.target.value })} placeholder="Separa los párrafos con una línea en blanco" /></label>
          <div className="masthead-panel__row"><label>Ciudad / base<input value={current.person.location} onChange={(event) => updatePerson(current.member.id, current.person.id, { location: event.target.value })} placeholder="San Andreas" /></label><label>Agencia<input value={current.person.agency} onChange={(event) => updatePerson(current.member.id, current.person.id, { agency: event.target.value })} placeholder="LIGHT Talent" /></label></div>
          <label>Facebrowser<input value={current.person.facebrowser} onChange={(event) => updatePerson(current.member.id, current.person.id, { facebrowser: event.target.value })} placeholder="@usuario o URL del perfil" /></label>

          <p className="masthead-panel__section">Imagen principal de la hoja <small>Si no hay, se usa el retrato</small></p>
          <ImageUrlFrame className="masthead-panel__cover" src={current.person.coverImage} onChange={(coverImage) => updatePerson(current.member.id, current.person.id, { coverImage })} emptyLabel="Clic para añadir la imagen principal" readOnly={readOnly} />

          <p className="masthead-panel__section">Datos <small>Altura, ojos, temporadas…</small></p>
          <div className="masthead-panel__facts">{current.person.facts.map((fact, index) => <div className="masthead-panel__fact" key={index}><input aria-label="Dato" value={fact.label} onChange={(event) => updatePerson(current.member.id, current.person.id, { facts: current.person.facts.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} placeholder="Altura" /><input aria-label="Valor" value={fact.value} onChange={(event) => updatePerson(current.member.id, current.person.id, { facts: current.person.facts.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) })} placeholder="1,78 m" /><button type="button" onClick={() => updatePerson(current.member.id, current.person.id, { facts: current.person.facts.filter((_, itemIndex) => itemIndex !== index) })} aria-label="Quitar dato"><X size={13} /></button></div>)}
            {!readOnly && <button type="button" className="masthead-panel__add" onClick={() => updatePerson(current.member.id, current.person.id, { facts: [...current.person.facts, { label: "", value: "" }] })}><Plus size={13} /> Añadir dato</button>}</div>

          <p className="masthead-panel__section">Galería / book</p>
          <GalleryEditor images={current.person.gallery} onChange={(gallery) => updatePerson(current.member.id, current.person.id, { gallery })} readOnly={readOnly} />

          <div className="masthead-panel__footer"><button type="button" className="wysiwyg-link" onClick={() => setSelected(null)}>Cerrar ficha</button>{!readOnly && <button type="button" className="masthead-panel__remove" onClick={removePerson}><Trash2 size={13} /> Quitar persona</button>}</div>
        </fieldset> : <div className="masthead-panel__empty"><UserRound size={28} strokeWidth={1} /><p>Selecciona un retrato para editar su ficha y su hoja propia.</p></div>}
      </aside>
    </div>
  </section>;
}
