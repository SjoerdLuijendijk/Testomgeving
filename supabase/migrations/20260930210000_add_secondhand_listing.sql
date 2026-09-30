-- 2dehands.be gets its own checkbox; "marketplace_listed" now means Marktplaats only. Stoves that
-- were ticked for "Marktplaats en 2dehands" stay ticked for both.
alter table public.stoves add column secondhand_listed boolean not null default false;
update public.stoves set secondhand_listed = marketplace_listed where marketplace_listed;

grant insert (secondhand_listed), update (secondhand_listed) on public.stoves to authenticated;

-- Same as in the made-to-order migration, plus unticking 2dehands when a stove sells out.
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
    new.secondhand_listed := false;
  else
    new.sold_at := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_stove_stock() from public, anon, authenticated;

drop trigger stoves_sync_stock on public.stoves;
create trigger stoves_sync_stock
  before insert or update of stock_quantity, sold_at, shop_listed, marketplace_listed, secondhand_listed, made_to_order
  on public.stoves
  for each row execute function public.sync_stove_stock();
