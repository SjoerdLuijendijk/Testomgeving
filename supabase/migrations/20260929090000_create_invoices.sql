-- Invoices for stoves: company settings, immutable invoices with sequential numbers per year
-- (2026-0001, 2026-0002, ...) and their lines. Only team members have access.

-- Company details printed on invoices. A single row.
create table public.company_settings (
  id boolean primary key default true check (id),
  name text not null check (char_length(name) between 1 and 200),
  address text not null check (char_length(address) between 1 and 200),
  postal_code text not null check (char_length(postal_code) between 1 and 20),
  city text not null check (char_length(city) between 1 and 100),
  kvk_number text not null check (char_length(kvk_number) between 1 and 20),
  vat_number text not null check (char_length(vat_number) between 1 and 30),
  iban text not null check (char_length(iban) between 1 and 40),
  email text check (char_length(email) <= 320),
  phone text check (char_length(phone) <= 40),
  payment_term_days integer not null default 14 check (payment_term_days between 0 and 365),
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;
revoke all on public.company_settings from anon, authenticated;
grant select, insert, update on public.company_settings to authenticated;

create policy "company_settings select" on public.company_settings for select to authenticated
  using ((select public.is_team_member()));
create policy "company_settings insert" on public.company_settings for insert to authenticated
  with check ((select public.is_team_member()));
create policy "company_settings update" on public.company_settings for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));

-- Invoices are never changed or deleted after creation (corrections go through a credit invoice).
-- The seller details are copied onto the invoice, so later settings changes do not alter it.
create table public.invoices (
  id bigint generated always as identity primary key,
  invoice_year integer not null,
  sequence_number integer not null check (sequence_number > 0),
  invoice_number text generated always as (invoice_year::text || '-' || lpad(sequence_number::text, 4, '0')) stored unique,
  stove_number bigint not null references public.stoves (number),
  issue_date date not null,
  seller jsonb not null,
  customer_name text not null check (char_length(customer_name) between 1 and 200),
  customer_address text not null check (char_length(customer_address) between 1 and 200),
  customer_postal_code text not null check (char_length(customer_postal_code) between 1 and 20),
  customer_city text not null check (char_length(customer_city) between 1 and 100),
  customer_email text check (char_length(customer_email) <= 320),
  customer_phone text check (char_length(customer_phone) <= 40),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (invoice_year, sequence_number)
);

create index invoices_stove_number_idx on public.invoices (stove_number);

create table public.invoice_lines (
  id bigint generated always as identity primary key,
  invoice_id bigint not null references public.invoices (id) on delete cascade,
  position integer not null check (position > 0),
  description text not null check (char_length(description) between 1 and 200),
  quantity integer not null check (quantity between 1 and 1000),
  unit_price_cents bigint not null check (unit_price_cents between 0 and 100000000),
  vat_rate integer not null check (vat_rate in (0, 9, 21)),
  unique (invoice_id, position)
);

create table public.invoice_counters (
  invoice_year integer primary key,
  last_number integer not null
);

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.invoice_counters enable row level security;
revoke all on public.invoices, public.invoice_lines, public.invoice_counters from anon, authenticated;
-- Read-only for clients: invoices are only created through create_invoice().
grant select on public.invoices, public.invoice_lines to authenticated;

create policy "invoices select" on public.invoices for select to authenticated
  using ((select public.is_team_member()));
create policy "invoice_lines select" on public.invoice_lines for select to authenticated
  using ((select public.is_team_member()));

-- Creates an invoice with its lines in one transaction and hands out the next number of the year.
-- Unit prices are in cents including VAT.
create function public.create_invoice(p_stove_number bigint, p_customer jsonb, p_lines jsonb)
returns table (id bigint, invoice_number text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today date := (now() at time zone 'Europe/Amsterdam')::date;
  v_year integer := extract(year from v_today)::integer;
  v_sequence integer;
  v_invoice_id bigint;
  v_seller jsonb;
  v_line jsonb;
  v_position integer := 0;
begin
  if not public.is_team_member() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not exists (select 1 from public.stoves s where s.number = p_stove_number) then
    raise exception 'unknown stove' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 50 then
    raise exception 'invoice needs 1 to 50 lines' using errcode = '22023';
  end if;

  select to_jsonb(c) - 'id' - 'updated_at' into v_seller from public.company_settings c where c.id;
  if v_seller is null then
    raise exception 'company settings missing' using errcode = 'P0002';
  end if;

  insert into public.invoice_counters as counter (invoice_year, last_number)
  values (v_year, 1)
  on conflict (invoice_year) do update set last_number = counter.last_number + 1
  returning counter.last_number into v_sequence;

  insert into public.invoices (
    invoice_year, sequence_number, stove_number, issue_date, seller,
    customer_name, customer_address, customer_postal_code, customer_city, customer_email, customer_phone
  )
  values (
    v_year, v_sequence, p_stove_number, v_today, v_seller,
    p_customer ->> 'name', p_customer ->> 'address', p_customer ->> 'postal_code', p_customer ->> 'city',
    nullif(p_customer ->> 'email', ''), nullif(p_customer ->> 'phone', '')
  )
  returning invoices.id into v_invoice_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_position := v_position + 1;
    insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price_cents, vat_rate)
    values (
      v_invoice_id, v_position, v_line ->> 'description', (v_line ->> 'quantity')::integer,
      (v_line ->> 'unit_price_cents')::bigint, (v_line ->> 'vat_rate')::integer
    );
  end loop;

  return query select i.id, i.invoice_number from public.invoices i where i.id = v_invoice_id;
end;
$$;

revoke execute on function public.create_invoice(bigint, jsonb, jsonb) from public, anon;
grant execute on function public.create_invoice(bigint, jsonb, jsonb) to authenticated;
