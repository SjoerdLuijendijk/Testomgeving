-- Sales notes per stove: negotiations and sales with the buyer, handover, price, payment and
-- agreements. A stove can have several notes (several interested buyers, or one per sold unit of a
-- new stove). Only team members have access. Closed notes (done or cancelled) are deleted by the app
-- one year after closing, because they hold personal data of the buyer.
create table public.stove_notes (
  id bigint generated always as identity primary key,
  stove_number bigint not null references public.stoves (number) on delete cascade,
  status text not null default 'negotiating' check (status in ('negotiating', 'sold', 'done', 'cancelled')),
  buyer_name text check (char_length(buyer_name) between 1 and 200),
  buyer_phone text check (char_length(buyer_phone) between 1 and 40),
  buyer_email text check (char_length(buyer_email) between 1 and 320),
  buyer_address text check (char_length(buyer_address) between 1 and 200),
  buyer_postal_code text check (char_length(buyer_postal_code) between 1 and 20),
  buyer_city text check (char_length(buyer_city) between 1 and 100),
  handover text check (handover in ('pickup', 'delivery')),
  handover_date date,
  handover_time time,
  price_cents bigint check (price_cents between 0 and 100000000),
  payment_status text not null default 'open' check (payment_status in ('open', 'deposit', 'paid')),
  payment_method text check (payment_method in ('cash', 'pin', 'bank')),
  paid_cents bigint check (paid_cents between 0 and 100000000),
  agreements text check (char_length(agreements) between 1 and 2000),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  check ((closed_at is not null) = (status in ('done', 'cancelled'))),
  check (handover_time is null or handover_date is not null)
);

create index stove_notes_stove_number_idx on public.stove_notes (stove_number);
create index stove_notes_open_idx on public.stove_notes (stove_number) where closed_at is null;
create index stove_notes_closed_at_idx on public.stove_notes (closed_at) where closed_at is not null;

-- Guards the status flow and keeps the stock in step with it:
--   negotiating -> sold | cancelled,  sold -> done | cancelled,  done and cancelled are final.
-- A note that becomes sold takes one unit from the stock of the stove (not for made-to-order stoves,
-- which keep no stock). It runs as the caller, so the stoves RLS policies and column grants apply,
-- and a sold-out stove makes the insert or update fail with the stock check violation. Cancelling a
-- sale does not restock: the app asks the user whether the stove is back in stock.
create function public.stove_notes_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.stove_number <> old.stove_number then
      raise exception 'A note cannot move to another stove';
    end if;
    if new.status <> old.status and not (
      (old.status = 'negotiating' and new.status in ('sold', 'cancelled'))
      or (old.status = 'sold' and new.status in ('done', 'cancelled'))
    ) then
      raise exception 'Invalid note status change from % to %', old.status, new.status;
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
  elsif new.status not in ('negotiating', 'sold') then
    raise exception 'A new note is open';
  end if;

  if new.status in ('done', 'cancelled') then
    new.closed_at := coalesce(old.closed_at, now());
  else
    new.closed_at := null;
  end if;

  if new.status = 'sold' and (tg_op = 'INSERT' or old.status <> 'sold') then
    update public.stoves
    set stock_quantity = stock_quantity - 1
    where number = new.stove_number and not made_to_order;
  end if;

  return new;
end;
$$;

revoke execute on function public.stove_notes_before_write() from public, anon, authenticated;

create trigger stove_notes_before_write
  before insert or update on public.stove_notes
  for each row execute function public.stove_notes_before_write();

alter table public.stove_notes enable row level security;
revoke all on public.stove_notes from anon, authenticated;
grant select, delete on public.stove_notes to authenticated;
grant insert (stove_number, status, buyer_name, buyer_phone, buyer_email, buyer_address, buyer_postal_code, buyer_city,
  handover, handover_date, handover_time, price_cents, payment_status, payment_method, paid_cents, agreements)
  on public.stove_notes to authenticated;
grant update (status, buyer_name, buyer_phone, buyer_email, buyer_address, buyer_postal_code, buyer_city,
  handover, handover_date, handover_time, price_cents, payment_status, payment_method, paid_cents, agreements)
  on public.stove_notes to authenticated;

create policy "stove_notes select" on public.stove_notes for select to authenticated
  using ((select public.is_team_member()));
create policy "stove_notes insert" on public.stove_notes for insert to authenticated
  with check ((select public.is_team_member()));
create policy "stove_notes update" on public.stove_notes for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));
create policy "stove_notes delete" on public.stove_notes for delete to authenticated
  using ((select public.is_team_member()));
