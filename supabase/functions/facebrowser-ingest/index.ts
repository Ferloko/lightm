// LIGHT — Edge Function que registra métricas de Facebrowser (red social de GTA World).
//
// Es el punto de entrada para una API, un bot o un script que obtenga los datos reales
// de la cuenta y los envíe aquí. No consulta Facebrowser por sí misma: cuando exista una
// API pública, basta con que quien la lea haga POST a esta función.
//
// Despliegue:   supabase functions deploy facebrowser-ingest --no-verify-jwt
// Secreto:      supabase secrets set FACEBROWSER_INGEST_KEY=<una clave larga y aleatoria>
//
// Petición:
//   POST /functions/v1/facebrowser-ingest
//   x-ingest-key: <FACEBROWSER_INGEST_KEY>
//   { "account": "light", "followers": 1200, "posts": 48, "impressions": 15000,
//     "interactions": 900, "profileVisits": 300, "capturedAt": "2026-11-10T18:00:00Z" }
// También acepta un array de esos objetos para enviar varias fotos de golpe.
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function count(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : NaN;
}

function toRow(input: Record<string, unknown>) {
  const row = {
    account: String(input.account ?? "light").trim().slice(0, 80) || "light",
    captured_at: input.capturedAt ? new Date(String(input.capturedAt)).toISOString() : new Date().toISOString(),
    followers: count(input.followers),
    posts: count(input.posts),
    impressions: count(input.impressions),
    interactions: count(input.interactions),
    profile_visits: count(input.profileVisits),
    source: String(input.source ?? "api").slice(0, 40),
    raw: input,
  };
  const numbers = [row.followers, row.posts, row.impressions, row.interactions, row.profile_visits];
  if (numbers.some((value) => Number.isNaN(value))) throw new Error("Los contadores deben ser enteros positivos.");
  if (numbers.every((value) => value === null)) throw new Error("Envía al menos un contador.");
  return row;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const expected = Deno.env.get("FACEBROWSER_INGEST_KEY");
  if (!expected) return json({ error: "FACEBROWSER_INGEST_KEY no está configurada." }, 503);
  if (request.headers.get("x-ingest-key") !== expected) return json({ error: "Clave no válida." }, 401);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido." }, 400); }
  const items = Array.isArray(body) ? body : [body];
  if (!items.length || items.length > 500) return json({ error: "Envía entre 1 y 500 registros." }, 400);

  let rows;
  try { rows = items.map((item) => toRow((item ?? {}) as Record<string, unknown>)); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Datos inválidos." }, 400); }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error } = await admin.from("facebrowser_metrics").insert(rows);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, inserted: rows.length });
});
