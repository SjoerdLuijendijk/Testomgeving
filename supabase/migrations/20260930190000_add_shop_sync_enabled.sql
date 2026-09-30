-- Whether the app may change this stove's web shop product. Stoves imported from the shop start
-- unlinked, so nothing in the shop changes until a team member links the stove explicitly.
alter table public.stoves add column shop_sync_enabled boolean not null default true;

grant insert (shop_sync_enabled), update (shop_sync_enabled) on public.stoves to authenticated;
