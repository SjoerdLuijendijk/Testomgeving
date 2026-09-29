-- Whether a stove should be offered in the WooCommerce web shop. Off by default so existing
-- stoves stay offline until a team member ticks them; the shop sync itself follows later.
alter table public.stoves
  add column shop_listed boolean not null default false;

-- Row access is still limited to team members by the existing stoves policies.
grant insert (shop_listed), update (shop_listed) on public.stoves to authenticated;
