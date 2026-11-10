import { supabase } from "./supabase";
import type { EditorialRole } from "./editorial";

export type DashboardSection = "overview" | "editions" | "runway" | "masthead" | "homepage-feature" | "coming-soon" | "calendar" | "campaigns" | "subscribers" | "comments" | "deletion-requests" | "team";
export type SectionAccess = { view: boolean; edit: boolean };
export type DashboardPermissions = Record<DashboardSection, SectionAccess>;
export type DbRole = "owner" | "admin" | "staff_writer";

export const dashboardSections: { key: DashboardSection; label: string; help: string }[] = [
  { key: "overview", label: "Resumen", help: "Visitas, KPIs y planificación." },
  { key: "editions", label: "Ediciones", help: "Catálogo de la revista digital." },
  { key: "runway", label: "Runway", help: "Firmas y pasarelas." },
  { key: "masthead", label: "Masthead", help: "Equipo, modelos y sus hojas." },
  { key: "homepage-feature", label: "Destacado", help: "Destacado del homepage y ubicaciones en portada/Archivo." },
  { key: "coming-soon", label: "Próximamente", help: "Cerrar o abrir secciones al público." },
  { key: "calendar", label: "Calendario", help: "Eventos compartidos." },
  { key: "campaigns", label: "Campañas", help: "Ventanas de campaña." },
  { key: "subscribers", label: "Suscriptores", help: "Correos de la newsletter (datos personales)." },
  { key: "comments", label: "Comentarios", help: "Mensajes del formulario de Business (datos personales)." },
  { key: "deletion-requests", label: "Solicitudes", help: "Solicitudes de borrado de borradores." },
  { key: "team", label: "Equipo", help: "Cuentas, roles, bloqueos y estos permisos." },
];

export const roleLabels: Record<DbRole, EditorialRole> = { owner: "Owner", admin: "Admin", staff_writer: "Staff Writer" };
export const toDbRole = (role: EditorialRole): DbRole => role === "Owner" ? "owner" : role === "Admin" ? "admin" : "staff_writer";

const allAccess = (): DashboardPermissions => Object.fromEntries(dashboardSections.map(({ key }) => [key, { view: true, edit: true }])) as DashboardPermissions;
const noAccess = (): DashboardPermissions => Object.fromEntries(dashboardSections.map(({ key }) => [key, { view: false, edit: false }])) as DashboardPermissions;

/** Fallback used before the migration 20261110 is applied: the old fixed rules. */
function legacyPermissions(role: EditorialRole): DashboardPermissions {
  if (role !== "Staff Writer") return { ...allAccess(), team: { view: role === "Owner", edit: role === "Owner" } };
  const result = noAccess();
  (["overview", "editions", "runway", "homepage-feature", "coming-soon", "calendar", "campaigns", "subscribers"] as DashboardSection[]).forEach((key) => { result[key] = { view: true, edit: false }; });
  return result;
}

/** What the signed-in person can see and change in each Dashboard section. */
export async function fetchMyPermissions(role: EditorialRole): Promise<DashboardPermissions> {
  if (!supabase) return allAccess();
  const { data, error } = await supabase.rpc("my_dashboard_permissions");
  if (error || !Array.isArray(data)) { console.warn("[LIGHT] Permisos no disponibles; aplica la migración 20261110.", error?.message); return legacyPermissions(role); }
  const result = noAccess();
  data.forEach((row: { section: DashboardSection; can_view: boolean; can_edit: boolean }) => { if (row.section in result) result[row.section] = { view: row.can_view === true, edit: row.can_edit === true }; });
  return result;
}

export type RolePermissionRow = { role: Exclude<DbRole, "owner">; section: DashboardSection; canView: boolean; canEdit: boolean };

export async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("dashboard_permissions").select("role,section,can_view,can_edit");
  if (error) throw error;
  return (data || []).map((row: any) => ({ role: row.role, section: row.section, canView: row.can_view === true, canEdit: row.can_edit === true }));
}

export async function saveRolePermission(row: RolePermissionRow) {
  if (!supabase) return;
  const canView = row.canView || row.canEdit;
  const { error } = await supabase.from("dashboard_permissions").upsert({ role: row.role, section: row.section, can_view: canView, can_edit: row.canEdit, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export type TeamMember = { id: string; email: string; displayName: string; role: DbRole; isActive: boolean; loginAlias: string; createdAt: string; lastSignInAt: string | null };

export async function fetchTeam(): Promise<TeamMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_editorial_team");
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, email: row.email || "", displayName: row.display_name || "", role: row.role, isActive: row.is_active !== false, loginAlias: row.login_alias || "", createdAt: row.created_at, lastSignInAt: row.last_sign_in_at || null }));
}

export async function updateTeamMember(member: TeamMember) {
  if (!supabase) return;
  const { error } = await supabase.rpc("update_editorial_member", { p_id: member.id, p_display_name: member.displayName, p_role: member.role, p_is_active: member.isActive, p_login_alias: member.loginAlias });
  if (error) throw error;
}

async function callUsersFunction(body: Record<string, unknown>) {
  if (!supabase) throw new Error("Crear cuentas requiere Supabase conectado.");
  const { data, error } = await supabase.functions.invoke("editorial-users", { body });
  if (error) {
    // The function answers with { error } — surface that message instead of a generic one.
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") { try { const payload = await context.json(); if (payload?.error) throw new Error(payload.error); } catch (inner) { if (inner instanceof Error && inner.message) throw inner; } }
    throw new Error(error.message.includes("Failed to send") ? "No se encontró la función editorial-users. Despliégala con: supabase functions deploy editorial-users" : error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function createTeamMember(input: { email: string; password: string; displayName: string; role: DbRole; loginAlias: string }) {
  return callUsersFunction({ action: "create", ...input });
}

export function setTeamMemberPassword(id: string, password: string) {
  return callUsersFunction({ action: "set-password", id, password });
}
