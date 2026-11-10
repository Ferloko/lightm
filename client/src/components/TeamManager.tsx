import { KeyRound, Lock, Plus, Save, ShieldCheck, Unlock, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createTeamMember, dashboardSections, fetchRolePermissions, fetchTeam, roleLabels, saveRolePermission, setTeamMemberPassword, updateTeamMember, type DbRole, type RolePermissionRow, type TeamMember } from "@/lib/team";
import { describeError, supabase } from "@/lib/supabase";

type Props = { canEdit: boolean; currentUserId: string | null; isOwner: boolean };
const editableRoles: Exclude<DbRole, "owner">[] = ["admin", "staff_writer"];

function formatDate(value: string | null) {
  if (!value) return "Nunca";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function NewMemberDialog({ isOwner, onClose, onCreated }: { isOwner: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "staff_writer" as DbRole, loginAlias: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try { await createTeamMember(form); onCreated(); onClose(); }
    catch (cause) { setError(describeError(cause)); }
    finally { setSaving(false); }
  };
  return <div className="calendar-modal-backdrop" role="presentation"><form className="calendar-modal team-modal" onSubmit={(event) => void submit(event)}>
    <button className="calendar-modal__close" type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
    <p className="eyebrow">Equipo / Nueva cuenta</p><h3>Crear usuario editorial.</h3>
    <label>Nombre editorial (byline)<input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Moonglow" /></label>
    <label>Correo de acceso<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nombre@light.studio" /></label>
    <label>Contraseña inicial (mín. 10 caracteres)<input required minLength={10} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
    <label>Palabra de acceso en el buscador<input value={form.loginAlias} onChange={(event) => setForm({ ...form, loginAlias: event.target.value.replace(/\s+/g, "").toLowerCase() })} placeholder="moonglow" /><small className="magazine-field-help">Escribirla en el buscador abre el acceso al Dashboard.</small></label>
    <label>Rol<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as DbRole })}>{isOwner && <option value="owner">Owner</option>}<option value="admin">Admin</option><option value="staff_writer">Staff Writer</option></select></label>
    {error && <p className="admin-notice admin-notice--error" role="alert">{error}</p>}
    <div className="calendar-modal__actions"><button className="admin-secondary" type="button" onClick={onClose}>Cancelar</button><button className="admin-primary" type="submit" disabled={saving}><UserPlus size={14} /> {saving ? "Creando…" : "Crear cuenta"}</button></div>
  </form></div>;
}

function PasswordDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setNotice("");
    try { await setTeamMemberPassword(member.id, password); setNotice("Contraseña actualizada."); setPassword(""); }
    catch (cause) { setNotice(describeError(cause)); }
    finally { setSaving(false); }
  };
  return <div className="calendar-modal-backdrop" role="presentation"><form className="calendar-modal team-modal" onSubmit={(event) => void submit(event)}>
    <button className="calendar-modal__close" type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
    <p className="eyebrow">Equipo / Contraseña</p><h3>{member.displayName}</h3>
    <label>Nueva contraseña (mín. 10 caracteres)<input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="calendar-modal__actions"><button className="admin-secondary" type="button" onClick={onClose}>Cerrar</button><button className="admin-primary" type="submit" disabled={saving}><KeyRound size={14} /> {saving ? "Guardando…" : "Cambiar contraseña"}</button></div>
  </form></div>;
}

export default function TeamManager({ canEdit, currentUserId, isOwner }: Props) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TeamMember>>({});
  const [permissions, setPermissions] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [passwordFor, setPasswordFor] = useState<TeamMember | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [members, rows] = await Promise.all([fetchTeam(), fetchRolePermissions()]);
      setTeam(members); setDrafts({}); setPermissions(rows); setNotice("");
    } catch (cause) {
      setNotice(`No se pudo cargar el equipo: ${describeError(cause)}. Aplica la migración 20261110_team_permissions_sync.sql en Supabase.`);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const permissionFor = useCallback((role: Exclude<DbRole, "owner">, section: RolePermissionRow["section"]) => permissions.find((row) => row.role === role && row.section === section) || { role, section, canView: false, canEdit: false }, [permissions]);
  const togglePermission = async (role: Exclude<DbRole, "owner">, section: RolePermissionRow["section"], field: "canView" | "canEdit") => {
    const current = permissionFor(role, section);
    const next = { ...current, [field]: !current[field] };
    if (field === "canView" && !next.canView) next.canEdit = false; // no edit without view
    if (field === "canEdit" && next.canEdit) next.canView = true;
    setPermissions((rows) => [...rows.filter((row) => !(row.role === role && row.section === section)), next]);
    try { await saveRolePermission(next); setNotice(`Permiso actualizado: ${roleLabels[role]} / ${dashboardSections.find((item) => item.key === section)?.label}.`); }
    catch (cause) { setNotice(`No se pudo guardar el permiso: ${describeError(cause)}`); void load(); }
  };

  const edit = (member: TeamMember, patch: Partial<TeamMember>) => setDrafts((current) => ({ ...current, [member.id]: { ...(current[member.id] || member), ...patch } }));
  const saveMember = async (member: TeamMember) => {
    try { await updateTeamMember(member); setNotice(`${member.displayName} actualizado.`); await load(); }
    catch (cause) { setNotice(`No se pudo guardar: ${describeError(cause)}`); }
  };
  const toggleBlock = async (member: TeamMember) => {
    if (member.id === currentUserId) { setNotice("No puedes bloquear tu propia cuenta."); return; }
    const next = { ...member, isActive: !member.isActive };
    if (!next.isActive && !window.confirm(`¿Bloquear a ${member.displayName}? Perderá el acceso al Dashboard al instante.`)) return;
    await saveMember(next);
  };

  const sorted = useMemo(() => [...team].sort((a, b) => ["owner", "admin", "staff_writer"].indexOf(a.role) - ["owner", "admin", "staff_writer"].indexOf(b.role) || a.displayName.localeCompare(b.displayName)), [team]);

  if (!supabase) return <section className="team-manager"><div className="admin-section-heading"><div><p>LIGHT / Equipo</p><h2>Equipo y permisos.</h2></div></div><p className="admin-notice">La gestión de cuentas necesita Supabase conectado. En la demostración local hay un único perfil de prueba.</p></section>;

  return <section className="team-manager">
    <div className="admin-section-heading"><div><p>LIGHT / Equipo</p><h2>Equipo y permisos.</h2></div><div className="admin-section-heading__actions">{canEdit && <button className="admin-primary" type="button" onClick={() => setCreating(true)}><Plus size={15} /> Nuevo usuario</button>}</div></div>
    <p className="team-manager__intro">Crea cuentas, cambia roles, bloquea o desbloquea el acceso y decide qué apartados del Dashboard puede ver o editar cada rol. Owner siempre tiene acceso completo. Los permisos se aplican en la base de datos, no solo en la pantalla.</p>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {loading ? <p className="comments-manager__empty">Cargando equipo…</p> : <>
      <div className="team-table" role="table" aria-label="Cuentas editoriales">
        <div className="team-table__row team-table__row--head" role="row"><span>Persona</span><span>Rol</span><span>Palabra de acceso</span><span>Último acceso</span><span>Estado</span><span /></div>
        {sorted.map((original) => { const member = drafts[original.id] || original; const dirty = Boolean(drafts[original.id]); const self = member.id === currentUserId; const lockedOwner = original.role === "owner" && !isOwner; return <div className={`team-table__row${member.isActive ? "" : " is-blocked"}`} role="row" key={member.id}>
          <div className="team-table__person"><input aria-label="Nombre editorial" value={member.displayName} disabled={!canEdit || lockedOwner} onChange={(event) => edit(original, { displayName: event.target.value })} /><small>{member.email}{self ? " · tú" : ""}</small></div>
          <select aria-label="Rol" value={member.role} disabled={!canEdit || lockedOwner || self} onChange={(event) => edit(original, { role: event.target.value as DbRole })}>{(isOwner || member.role === "owner") && <option value="owner">Owner</option>}<option value="admin">Admin</option><option value="staff_writer">Staff Writer</option></select>
          <input aria-label="Palabra de acceso" value={member.loginAlias} placeholder="—" disabled={!canEdit || lockedOwner} onChange={(event) => edit(original, { loginAlias: event.target.value.replace(/\s+/g, "").toLowerCase() })} />
          <span>{formatDate(member.lastSignInAt)}</span>
          <span className={`team-status ${member.isActive ? "is-active" : "is-blocked"}`}>{member.isActive ? "Activa" : "Bloqueada"}</span>
          <div className="team-table__actions">{canEdit && !lockedOwner && <>{dirty && <button className="admin-primary" type="button" onClick={() => void saveMember(member)}><Save size={13} /> Guardar</button>}<button className="admin-secondary" type="button" title="Cambiar contraseña" onClick={() => setPasswordFor(member)}><KeyRound size={13} /></button>{!self && <button className="admin-secondary" type="button" onClick={() => void toggleBlock(original)}>{member.isActive ? <><Lock size={13} /> Bloquear</> : <><Unlock size={13} /> Desbloquear</>}</button>}</>}</div>
        </div>; })}
      </div>

      <div className="admin-section-heading team-permissions__heading"><div><p>Permisos por rol</p><h2>Qué puede ver y editar cada rol.</h2></div><span className="team-permissions__owner"><ShieldCheck size={14} /> Owner: acceso total</span></div>
      <p className="team-manager__intro">Las páginas/artículos siguen reglas fijas: Staff Writer crea y edita sus borradores y solicita su borrado; Owner y Admin publican y borran.</p>
      <div className="permission-matrix" role="table" aria-label="Permisos del Dashboard">
        <div className="permission-matrix__row permission-matrix__row--head" role="row"><span>Apartado</span>{editableRoles.map((role) => <span key={role}>{roleLabels[role]}</span>)}</div>
        {dashboardSections.map((section) => <div className="permission-matrix__row" role="row" key={section.key}><div><strong>{section.label}</strong><small>{section.help}</small></div>{editableRoles.map((role) => { const row = permissionFor(role, section.key); return <div className="permission-matrix__cell" key={role} data-role={roleLabels[role]}><label><input type="checkbox" checked={row.canView} disabled={!isOwner} onChange={() => void togglePermission(role, section.key, "canView")} /> Ver</label><label><input type="checkbox" checked={row.canEdit} disabled={!isOwner} onChange={() => void togglePermission(role, section.key, "canEdit")} /> Editar</label></div>; })}</div>)}
      </div>
      {!isOwner && <p className="admin-notice">Solo un Owner puede cambiar los permisos por rol.</p>}
    </>}
    {creating && <NewMemberDialog isOwner={isOwner} onClose={() => setCreating(false)} onCreated={() => { setNotice("Cuenta creada. Ya puede entrar con su correo o su palabra de acceso."); void load(); }} />}
    {passwordFor && <PasswordDialog member={passwordFor} onClose={() => setPasswordFor(null)} />}
  </section>;
}
