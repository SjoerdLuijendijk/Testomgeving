-- Replace the notes test app with the Woonwarmer stove inventory.
-- The notes data is disposable test data; its policies allowed anonymous access.

drop policy if exists "note-files select" on storage.objects;
drop policy if exists "note-files insert" on storage.objects;
drop policy if exists "note-files delete" on storage.objects;
drop table if exists public.note_files;
drop table if exists public.notes;
-- The now inaccessible 'note-files' bucket must be emptied and deleted via the
-- Storage API or dashboard; Supabase blocks deleting storage objects from SQL.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- Team allowlist. Managed by an administrator (SQL editor); not readable by clients.
create table public.team_members (
  email text primary key check (email = lower(email) and char_length(email) between 3 and 320),
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;
revoke all on public.team_members from anon, authenticated;

create function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

revoke execute on function public.is_team_member() from public, anon;
grant execute on function public.is_team_member() to authenticated;

-- Stoves. The identity column is the stove number shown in the app (1001, 1002, ...).
create table public.stoves (
  number bigint generated always as identity (start with 1001) primary key,
  brand text not null check (char_length(brand) between 1 and 100),
  model text not null check (char_length(model) between 1 and 100),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

alter table public.stoves enable row level security;
revoke all on public.stoves from anon, authenticated;
grant select, insert (brand, model) on public.stoves to authenticated;
-- Only the sold status can change after creation.
grant update (sold_at) on public.stoves to authenticated;

create policy "stoves select" on public.stoves for select to authenticated
  using ((select public.is_team_member()));
create policy "stoves insert" on public.stoves for insert to authenticated
  with check ((select public.is_team_member()));
create policy "stoves update" on public.stoves for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));

-- Stove photos, stored in the private 'stove-photos' bucket under "<stove number>/<uuid>.jpg".
create table public.stove_photos (
  id bigint generated always as identity primary key,
  stove_number bigint not null references public.stoves (number) on delete cascade,
  path text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  check (path like stove_number::text || '/%')
);

create index stove_photos_stove_number_idx on public.stove_photos (stove_number);

alter table public.stove_photos enable row level security;
revoke all on public.stove_photos from anon, authenticated;
grant select, insert (stove_number, path), delete on public.stove_photos to authenticated;

create policy "stove_photos select" on public.stove_photos for select to authenticated
  using ((select public.is_team_member()));
create policy "stove_photos insert" on public.stove_photos for insert to authenticated
  with check ((select public.is_team_member()));
create policy "stove_photos delete" on public.stove_photos for delete to authenticated
  using ((select public.is_team_member()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stove-photos', 'stove-photos', false, 4194304, array['image/jpeg']);

create policy "stove-photos select" on storage.objects for select to authenticated
  using (bucket_id = 'stove-photos' and (select public.is_team_member()));
create policy "stove-photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'stove-photos' and (select public.is_team_member()));
create policy "stove-photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'stove-photos' and (select public.is_team_member()));
