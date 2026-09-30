-- WooCommerce sync state per stove. The app pushes stove changes to the web shop in the
-- background (lib/woocommerce) and records the outcome here so the inventory can show failures.
alter table public.stoves
  add column shop_product_id bigint check (shop_product_id > 0),
  add column shop_synced_at timestamptz,
  add column shop_sync_error text check (char_length(shop_sync_error) between 1 and 500);

-- The sync runs with the signed-in team member's session; the "stoves update" policy still
-- limits it to team members.
grant update (shop_product_id, shop_synced_at, shop_sync_error) on public.stoves to authenticated;
