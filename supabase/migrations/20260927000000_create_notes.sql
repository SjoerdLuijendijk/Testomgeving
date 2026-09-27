create table public.notes (
  id bigint generated always as identity primary key,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "notes select" on public.notes for select to anon using (true);
create policy "notes insert" on public.notes for insert to anon with check (true);
create policy "notes delete" on public.notes for delete to anon using (true);
