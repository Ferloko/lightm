// LIGHT — Edge Function para crear cuentas editoriales y cambiar contraseñas.
// Despliegue:  supabase functions deploy editorial-users
// Usa SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY, que Supabase
// inyecta automáticamente en todas las Edge Functions. La clave de servicio
// nunca llega al navegador.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const roles = new Set(["owner", "admin", "staff_writer"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = request.headers.get("Authorization") ?? "";

  // 1. Quien llama debe tener permiso de edición sobre "Equipo".
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData } = await caller.auth.getUser();
  if (!userData.user) return json({ error: "Inicia sesión de nuevo." }, 401);
  const { data: allowed, error: permissionError } = await caller.rpc("can_dashboard", { p_section: "team", p_action: "edit" });
  if (permissionError || allowed !== true) return json({ error: "No tienes permiso para gestionar el equipo." }, 403);
  const { data: callerProfile } = await caller.from("profiles").select("role").eq("id", userData.user.id).single();

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Solicitud inválida." }, 400); }

  if (body.action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.displayName ?? "").trim();
    const role = String(body.role ?? "staff_writer");
    const loginAlias = String(body.loginAlias ?? "").trim().toLowerCase() || null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Correo inválido." }, 400);
    if (password.length < 10) return json({ error: "La contraseña debe tener al menos 10 caracteres." }, 400);
    if (!displayName) return json({ error: "Añade un nombre editorial." }, 400);
    if (!roles.has(role)) return json({ error: "Rol inválido." }, 400);
    if (role === "owner" && callerProfile?.role !== "owner") return json({ error: "Solo un Owner puede crear otro Owner." }, 403);

    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError || !created.user) return json({ error: createError?.message ?? "No se pudo crear la cuenta." }, 400);
    const { error: profileError } = await admin.from("profiles").insert({ id: created.user.id, display_name: displayName, role, login_alias: loginAlias, is_active: true });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: profileError.message }, 400);
    }
    return json({ ok: true, id: created.user.id });
  }

  if (body.action === "set-password") {
    const id = String(body.id ?? "");
    const password = String(body.password ?? "");
    if (password.length < 10) return json({ error: "La contraseña debe tener al menos 10 caracteres." }, 400);
    const { data: target } = await admin.from("profiles").select("role").eq("id", id).single();
    if (!target) return json({ error: "No se encontró el perfil." }, 404);
    if (target.role === "owner" && callerProfile?.role !== "owner") return json({ error: "Solo un Owner puede cambiar la contraseña de un Owner." }, 403);
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Acción desconocida." }, 400);
});
