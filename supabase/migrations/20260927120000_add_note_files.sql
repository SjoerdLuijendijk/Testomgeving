create table public.note_files (
  id bigint generated always as identity primary key,
  note_id bigint not null references public.notes (id) on delete cascade,
  path text not null unique,
  name text not null check (char_length(name) between 1 and 255),
  size bigint not null check (size >= 0),
  created_at timestamptz not null default now()
);

create index note_files_note_id_idx on public.note_files (note_id);

alter table public.note_files enable row level security;

create policy "note_files select" on public.note_files for select to anon using (true);
create policy "note_files insert" on public.note_files for insert to anon with check (true);
create policy "note_files delete" on public.note_files for delete to anon using (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('note-files', 'note-files', false, 4194304);

create policy "note-files select" on storage.objects for select to anon
  using (bucket_id = 'note-files');
create policy "note-files insert" on storage.objects for insert to anon
  with check (bucket_id = 'note-files');
create policy "note-files delete" on storage.objects for delete to anon
  using (bucket_id = 'note-files');
