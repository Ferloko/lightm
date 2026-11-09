-- Owner/Admin can review every editorial article, including Staff Writer drafts.
-- Authors can still see their own drafts; anonymous visitors only see published rows.
alter table public.articles enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Visitors can read published articles" on public.articles;
drop policy if exists "Visitors and admins can read eligible articles" on public.articles;
create policy "Visitors and admins can read eligible articles"
  on public.articles
  for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or public.current_editorial_role() in ('owner', 'admin')
  );

-- The Dashboard embeds profiles(display_name) to identify the draft author.
drop policy if exists "Admins can read author profiles" on public.profiles;
create policy "Admins can read author profiles"
  on public.profiles
  for select
  to authenticated
  using (public.current_editorial_role() in ('owner', 'admin'));
