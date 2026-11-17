-- LIGHT: Owner y Admin pueden escribir a mano las cifras de Redes de LIGHT (Facebrowser) desde el
-- Resumen del Dashboard. Cada actualización es una fila nueva (queda el historial). Idempotente.
grant insert on table public.facebrowser_metrics to authenticated;
drop policy if exists "Owner and admin can add Facebrowser metrics" on public.facebrowser_metrics;
create policy "Owner and admin can add Facebrowser metrics" on public.facebrowser_metrics
  for insert to authenticated with check (public.current_editorial_role() in ('owner', 'admin'));
