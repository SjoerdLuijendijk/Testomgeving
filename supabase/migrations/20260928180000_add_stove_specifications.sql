-- Stove specifications. Nullable so stoves registered before this migration stay valid;
-- the app requires them for new stoves.
alter table public.stoves
  add column condition text check (condition in ('new', 'used')),
  add column height_cm integer check (height_cm between 1 and 500),
  add column width_cm integer check (width_cm between 1 and 500),
  add column depth_cm integer check (depth_cm between 1 and 500),
  add column flue_outlet text check (flue_outlet in ('top', 'rear')),
  add column flue_diameter_mm integer check (flue_diameter_mm between 50 and 400);

grant insert (condition, height_cm, width_cm, depth_cm, flue_outlet, flue_diameter_mm)
  on public.stoves to authenticated;
