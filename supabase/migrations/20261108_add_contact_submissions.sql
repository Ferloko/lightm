-- Recibe colaboraciones y comentarios desde el formulario público de Business.
begin;

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  comment text not null,
  created_at timestamptz not null default now(),
  constraint contact_submissions_first_name_length check (char_length(btrim(first_name)) between 1 and 120),
  constraint contact_submissions_last_name_length check (char_length(btrim(last_name)) between 1 and 120),
  constraint contact_submissions_email_length check (char_length(email) between 3 and 254),
  constraint contact_submissions_email_format check (email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint contact_submissions_comment_length check (char_length(btrim(comment)) between 5 and 5000)
);

alter table public.contact_submissions enable row level security;

drop policy if exists "Anyone can submit Business comments" on public.contact_submissions;
create policy "Anyone can submit Business comments"
  on public.contact_submissions for insert to anon, authenticated
  with check (
    char_length(btrim(first_name)) between 1 and 120
    and char_length(btrim(last_name)) between 1 and 120
    and char_length(email) between 3 and 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    and char_length(btrim(comment)) between 5 and 5000
  );

drop policy if exists "Editors can read Business comments" on public.contact_submissions;
create policy "Editors can read Business comments"
  on public.contact_submissions for select to authenticated
  using (public.current_editorial_role() in ('owner', 'admin'));

grant insert on table public.contact_submissions to anon, authenticated;
grant select on table public.contact_submissions to authenticated;

commit;
