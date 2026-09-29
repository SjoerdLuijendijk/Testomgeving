-- New stove models that are sold without stock and ordered from the supplier when a customer buys
-- one. They are always available: no stock is tracked and they never sell out.
alter table public.stoves
  add column made_to_order boolean not null default false,
  add constraint stoves_made_to_order_new_only check (not made_to_order or condition = 'new');

grant insert (made_to_order), update (made_to_order) on public.stoves to authenticated;

create or replace function public.sync_stove_stock()
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

  -- Made-to-order stoves can always be ordered, so they never count as sold out.
  if new.made_to_order then
    new.stock_quantity := 1;
  end if;

  if new.stock_quantity = 0 then
    new.sold_at := coalesce(new.sold_at, now());
    new.shop_listed := false;
    new.marketplace_listed := false;
  else
    new.sold_at := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_stove_stock() from public, anon, authenticated;

drop trigger stoves_sync_stock on public.stoves;
create trigger stoves_sync_stock
  before insert or update of stock_quantity, sold_at, shop_listed, marketplace_listed, made_to_order
  on public.stoves
  for each row execute function public.sync_stove_stock();

-- Stock of made-to-order stoves cannot be adjusted; the function returns null for them.
create or replace function public.adjust_stove_stock(p_stove_number bigint, p_delta integer)
returns integer
language sql
security invoker
set search_path = ''
as $$
  update public.stoves
  set stock_quantity = stock_quantity + p_delta
  where number = p_stove_number and p_delta in (-1, 1) and not made_to_order
  returning stock_quantity;
$$;

revoke execute on function public.adjust_stove_stock(bigint, integer) from public, anon;
grant execute on function public.adjust_stove_stock(bigint, integer) to authenticated;
