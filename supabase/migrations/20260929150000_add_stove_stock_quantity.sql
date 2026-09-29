-- Stock per stove. A new stove model can have several units under one stove number; a used stove
-- is a single unit. A stove is sold (sold_at set) exactly when its stock is 0.
alter table public.stoves
  add column stock_quantity integer not null default 1;

update public.stoves set stock_quantity = 0 where sold_at is not null;

alter table public.stoves
  add constraint stoves_stock_quantity_range check (stock_quantity between 0 and 10000),
  add constraint stoves_used_single_unit check (condition is distinct from 'used' or stock_quantity <= 1),
  add constraint stoves_sold_when_out_of_stock check ((stock_quantity = 0) = (sold_at is not null));

-- Keeps sold_at and stock_quantity consistent. An update that only changes sold_at (the sold
-- toggle of used stoves, and of app versions from before this migration) sets the stock to 0 or 1.
create function public.sync_stove_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.stock_quantity = old.stock_quantity
     and new.sold_at is distinct from old.sold_at then
    new.stock_quantity := case when new.sold_at is null then 1 else 0 end;
  end if;

  if new.stock_quantity = 0 then
    new.sold_at := coalesce(new.sold_at, now());
  else
    new.sold_at := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_stove_stock() from public, anon, authenticated;

create trigger stoves_sync_stock
  before insert or update of stock_quantity, sold_at on public.stoves
  for each row execute function public.sync_stove_stock();

grant insert (stock_quantity), update (stock_quantity) on public.stoves to authenticated;

-- Sells (-1) or restocks (+1) one unit in a single statement, so concurrent clicks cannot lose an
-- update. Runs as the caller: the stoves RLS policies and column grants still apply. Returns the new
-- stock, or null when the stove does not exist or is not accessible.
create function public.adjust_stove_stock(p_stove_number bigint, p_delta integer)
returns integer
language sql
security invoker
set search_path = ''
as $$
  update public.stoves
  set stock_quantity = stock_quantity + p_delta
  where number = p_stove_number and p_delta in (-1, 1)
  returning stock_quantity;
$$;

revoke execute on function public.adjust_stove_stock(bigint, integer) from public, anon;
grant execute on function public.adjust_stove_stock(bigint, integer) to authenticated;
