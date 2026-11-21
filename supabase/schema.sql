-- =====================================================================
-- Al-Ferdous Quran Academy: database setup (run ONCE in Supabase > SQL Editor)
-- Step 1: replace  YOUR-ADMIN-EMAIL@example.com  (last section) with the email you log in with.
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.admins (
  email text primary key
);

create table if not exists public.site_content (
  id         text primary key check (id in ('published','draft')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists public.content_versions (
  id         bigint generated always as identity primary key,
  data       jsonb not null,
  label      text,
  created_at timestamptz not null default now(),
  created_by text
);

create table if not exists public.applications (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  student_name text not null check (char_length(student_name) between 1 and 200),
  whatsapp     text not null check (char_length(whatsapp) between 3 and 60),
  category     text check (char_length(category) <= 200),
  age          text check (char_length(age) <= 60),
  class_time   text check (char_length(class_time) <= 200),
  level        text check (char_length(level) <= 300),
  course       text check (char_length(course) <= 300),
  message      text check (char_length(message) <= 3000),
  lang         text check (lang in ('en','bn')),
  status       text not null default 'new' check (status in ('new','contacted','approved','rejected'))
);

-- ---------- who is an admin ----------
-- security definer: the function may read the admins table, visitors cannot.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email','')));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.admins           enable row level security;
alter table public.site_content     enable row level security;
alter table public.content_versions enable row level security;
alter table public.applications     enable row level security;

-- admins: RLS is on and there is NO policy, so nobody can read or write it through the API (only the SQL Editor).
-- Extra layer: also remove the table privileges from the API roles.
revoke all on public.admins from anon, authenticated;

-- site_content: the world can read the PUBLISHED row only; admins can do everything
drop policy if exists "public reads published" on public.site_content;
create policy "public reads published" on public.site_content for select to anon, authenticated using (id = 'published');
drop policy if exists "admin reads all" on public.site_content;
create policy "admin reads all" on public.site_content for select to authenticated using (public.is_admin());
drop policy if exists "admin inserts" on public.site_content;
create policy "admin inserts" on public.site_content for insert to authenticated with check (public.is_admin());
drop policy if exists "admin updates" on public.site_content;
create policy "admin updates" on public.site_content for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes" on public.site_content;
create policy "admin deletes" on public.site_content for delete to authenticated using (public.is_admin());

-- content_versions: admins only
drop policy if exists "admin all versions" on public.content_versions;
create policy "admin all versions" on public.content_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- applications: anyone may SUBMIT (status must be 'new'); only admins read / change / delete
drop policy if exists "anyone submits" on public.applications;
create policy "anyone submits" on public.applications for insert to anon, authenticated with check (status = 'new');
drop policy if exists "admin reads applications" on public.applications;
create policy "admin reads applications" on public.applications for select to authenticated using (public.is_admin());
drop policy if exists "admin updates applications" on public.applications;
create policy "admin updates applications" on public.applications for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes applications" on public.applications;
create policy "admin deletes applications" on public.applications for delete to authenticated using (public.is_admin());

-- ---------- image storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'];

-- Images are shown on the public website through public URLs (a public bucket needs no read policy for that).
-- Only admins may LIST files through the API, and only admins upload / replace / delete.
drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin read" on storage.objects;
create policy "media admin read" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ---------- first rows ----------
insert into public.site_content (id, data) values ('published', '{}'::jsonb), ('draft', '{}'::jsonb)
on conflict (id) do nothing;

-- ---------- YOUR admin account ----------
-- (1) Create the user first: Supabase > Authentication > Users > Add user > Create new user (email + a strong password, tick "Auto Confirm").
-- (2) Put the SAME email below, then run this line:
insert into public.admins (email) values ('YOUR-ADMIN-EMAIL@example.com') on conflict do nothing;
