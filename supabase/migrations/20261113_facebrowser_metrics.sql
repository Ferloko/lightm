-- LIGHT: métricas de Facebrowser, la red social de GTA World.
-- Cada fila es una "foto" de la cuenta en un momento dado. La escribe la Edge Function
-- facebrowser-ingest (con la clave de servicio) cuando una API o un bot envía datos;
-- el Dashboard solo la lee. Idempotente.

create table if not exists public.facebrowser_metrics (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  account text not null default 'light',          -- perfil medido (LIGHT u otro)
  followers integer check (followers >= 0),
  posts integer check (posts >= 0),
  impressions integer check (impressions >= 0),
  interactions integer check (interactions >= 0),  -- me gusta + comentarios + compartidos
  profile_visits integer check (profile_visits >= 0),
  source text not null default 'api',             -- 'api', 'manual'…
  raw jsonb,                                      -- respuesta original, por si la API cambia
  created_at timestamptz not null default now()
);

create index if not exists facebrowser_metrics_account_captured_idx
  on public.facebrowser_metrics (account, captured_at desc);

alter table public.facebrowser_metrics enable row level security;

-- Lectura: quien puede ver el Resumen del Dashboard. Escritura: solo la clave de servicio
-- (la Edge Function), por eso no hay políticas de insert/update/delete.
drop policy if exists "Dashboard can read Facebrowser metrics" on public.facebrowser_metrics;
create policy "Dashboard can read Facebrowser metrics" on public.facebrowser_metrics
  for select to authenticated using (public.can_dashboard('overview'));
