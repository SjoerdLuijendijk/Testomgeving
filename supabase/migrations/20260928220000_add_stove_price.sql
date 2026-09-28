-- Selling price including VAT, in euro cents. Nullable so existing stoves stay valid;
-- the app requires it for new stoves.
alter table public.stoves
  add column price_cents bigint check (price_cents between 1 and 100000000);

grant insert (price_cents) on public.stoves to authenticated;
