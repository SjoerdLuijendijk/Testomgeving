-- Articles (parts such as flue pipes, roof outlets and accessories) and quotes. Only team members
-- have access. Additive only, so it is safe for the app version in production.

-- Articles, matching the columns of the supplier CSV. The SKU is the key for the CSV import (an
-- import updates the article with the same SKU); articles added by hand may have no SKU. Prices are
-- excluding VAT, as in the CSV.
create table public.articles (
  id bigint generated always as identity primary key,
  sku text unique check (char_length(sku) between 1 and 100),
  name text not null check (char_length(name) between 1 and 200),
  category text check (char_length(category) between 1 and 100),
  brand text check (char_length(brand) between 1 and 100),
  -- In millimetres; an adapter has two sizes, such as "120>130".
  diameter_mm text check (diameter_mm ~ '^[0-9]{1,4}([>/-][0-9]{1,4})?$'),
  length_mm integer check (length_mm between 1 and 100000),
  color text check (char_length(color) between 1 and 100),
  material text check (char_length(material) between 1 and 100),
  wall_type text check (char_length(wall_type) between 1 and 100),
  unit text check (char_length(unit) between 1 and 40),
  purchase_price_ex_cents bigint check (purchase_price_ex_cents between 0 and 100000000),
  sale_price_ex_cents bigint check (sale_price_ex_cents between 0 and 100000000),
  vat_rate integer not null default 21 check (vat_rate in (0, 9, 21)),
  stock_quantity integer check (stock_quantity between 0 and 1000000),
  ean text check (char_length(ean) between 1 and 40),
  image_url text check (char_length(image_url) between 1 and 1000 and image_url ~ '^https?://'),
  supplier text check (char_length(supplier) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_category_idx on public.articles (category);

alter table public.articles enable row level security;
revoke all on public.articles from anon, authenticated;
grant select, insert, update, delete on public.articles to authenticated;

create policy "articles select" on public.articles for select to authenticated
  using ((select public.is_team_member()));
create policy "articles insert" on public.articles for insert to authenticated
  with check ((select public.is_team_member()));
create policy "articles update" on public.articles for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));
create policy "articles delete" on public.articles for delete to authenticated
  using ((select public.is_team_member()));

-- Quotes with their own numbering per year (O2026-0001, ...). Unlike invoices they stay editable;
-- the PDF uses the current company details. Lines copy description and price, and remember the stove
-- or article they came from.
create table public.quote_counters (
  quote_year integer primary key,
  last_number integer not null
);

create table public.quotes (
  id bigint generated always as identity primary key,
  quote_year integer not null,
  sequence_number integer not null check (sequence_number > 0),
  quote_number text generated always as ('O' || quote_year::text || '-' || lpad(sequence_number::text, 4, '0')) stored unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  issue_date date not null,
  valid_until date not null check (valid_until >= issue_date),
  customer_name text not null check (char_length(customer_name) between 1 and 200),
  customer_address text check (char_length(customer_address) <= 200),
  customer_postal_code text check (char_length(customer_postal_code) <= 20),
  customer_city text check (char_length(customer_city) <= 100),
  customer_email text check (char_length(customer_email) <= 320),
  customer_phone text check (char_length(customer_phone) <= 40),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (quote_year, sequence_number)
);

create table public.quote_lines (
  id bigint generated always as identity primary key,
  quote_id bigint not null references public.quotes (id) on delete cascade,
  position integer not null check (position > 0),
  description text not null check (char_length(description) between 1 and 200),
  quantity integer not null check (quantity between 1 and 1000),
  unit_price_cents bigint not null check (unit_price_cents between 0 and 100000000),
  vat_rate integer not null check (vat_rate in (0, 9, 21)),
  stove_number bigint,
  article_id bigint references public.articles (id) on delete set null,
  unique (quote_id, position)
);

create index quote_lines_quote_id_idx on public.quote_lines (quote_id);
create index quote_lines_article_id_idx on public.quote_lines (article_id);

alter table public.quote_counters enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
revoke all on public.quote_counters, public.quotes, public.quote_lines from anon, authenticated;
-- Content changes go through save_quote(); clients may read, change the status and delete.
grant select on public.quotes, public.quote_lines to authenticated;
grant update (status, updated_at) on public.quotes to authenticated;
grant delete on public.quotes to authenticated;

create policy "quotes select" on public.quotes for select to authenticated
  using ((select public.is_team_member()));
create policy "quotes update" on public.quotes for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));
create policy "quotes delete" on public.quotes for delete to authenticated
  using ((select public.is_team_member()));
create policy "quote_lines select" on public.quote_lines for select to authenticated
  using ((select public.is_team_member()));

-- Creates a quote (p_quote_id null; it gets the next number of the year) or replaces the content of
-- one, with its lines, in one transaction. Prices are in cents including VAT.
create function public.save_quote(p_quote_id bigint, p_quote jsonb, p_lines jsonb)
returns table (id bigint, quote_number text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today date := (now() at time zone 'Europe/Amsterdam')::date;
  v_year integer := extract(year from v_today)::integer;
  v_sequence integer;
  v_quote_id bigint := p_quote_id;
  v_line jsonb;
  v_position integer := 0;
begin
  if not public.is_team_member() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 50 then
    raise exception 'quote needs 1 to 50 lines' using errcode = '22023';
  end if;

  if v_quote_id is null then
    insert into public.quote_counters as counter (quote_year, last_number)
    values (v_year, 1)
    on conflict (quote_year) do update set last_number = counter.last_number + 1
    returning counter.last_number into v_sequence;

    insert into public.quotes (
      quote_year, sequence_number, issue_date, valid_until, customer_name, customer_address,
      customer_postal_code, customer_city, customer_email, customer_phone, notes
    )
    values (
      v_year, v_sequence, v_today, (p_quote ->> 'valid_until')::date, p_quote ->> 'customer_name',
      nullif(p_quote ->> 'customer_address', ''), nullif(p_quote ->> 'customer_postal_code', ''),
      nullif(p_quote ->> 'customer_city', ''), nullif(p_quote ->> 'customer_email', ''),
      nullif(p_quote ->> 'customer_phone', ''), nullif(p_quote ->> 'notes', '')
    )
    returning quotes.id into v_quote_id;
  else
    update public.quotes q set
      valid_until = (p_quote ->> 'valid_until')::date,
      customer_name = p_quote ->> 'customer_name',
      customer_address = nullif(p_quote ->> 'customer_address', ''),
      customer_postal_code = nullif(p_quote ->> 'customer_postal_code', ''),
      customer_city = nullif(p_quote ->> 'customer_city', ''),
      customer_email = nullif(p_quote ->> 'customer_email', ''),
      customer_phone = nullif(p_quote ->> 'customer_phone', ''),
      notes = nullif(p_quote ->> 'notes', ''),
      updated_at = now()
    where q.id = v_quote_id;
    if not found then
      raise exception 'unknown quote' using errcode = 'P0002';
    end if;
    delete from public.quote_lines l where l.quote_id = v_quote_id;
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_position := v_position + 1;
    insert into public.quote_lines (quote_id, position, description, quantity, unit_price_cents, vat_rate, stove_number, article_id)
    values (
      v_quote_id, v_position, v_line ->> 'description', (v_line ->> 'quantity')::integer,
      (v_line ->> 'unit_price_cents')::bigint, (v_line ->> 'vat_rate')::integer,
      (v_line ->> 'stove_number')::bigint,
      (select a.id from public.articles a where a.id = (v_line ->> 'article_id')::bigint)
    );
  end loop;

  return query select q.id, q.quote_number from public.quotes q where q.id = v_quote_id;
end;
$$;

revoke execute on function public.save_quote(bigint, jsonb, jsonb) from public, anon;
grant execute on function public.save_quote(bigint, jsonb, jsonb) to authenticated;
