-- Whether a stove should be offered on Marktplaats and 2dehands. Off by default, like shop_listed.
alter table public.stoves
  add column marketplace_listed boolean not null default false;

grant insert (marketplace_listed), update (marketplace_listed) on public.stoves to authenticated;

-- A stove without stock is offered nowhere. Existing sold stoves are unlisted now; the trigger
-- below keeps it that way, including when a listing is ticked for a sold stove.
update public.stoves set shop_listed = false where stock_quantity = 0 and shop_listed;

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
  before insert or update of stock_quantity, sold_at, shop_listed, marketplace_listed on public.stoves
  for each row execute function public.sync_stove_stock();
