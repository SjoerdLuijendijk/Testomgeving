-- Product details the WooCommerce shop shows for a stove. All nullable: stoves registered
-- before this migration stay valid, and the fields are optional in the app.
alter table public.stoves
  add column product_name text check (char_length(product_name) between 1 and 100),
  add column stove_type text check (stove_type in ('soapstone', 'wood', 'pot', 'wood_central_heating')),
  add column power_kw numeric(4, 1) check (power_kw between 0.1 and 99.9),
  add column min_power_kw numeric(4, 1) check (min_power_kw between 0.1 and 99.9),
  add column max_power_kw numeric(4, 1) check (max_power_kw between 0.1 and 99.9),
  add column weight_kg integer check (weight_kg between 1 and 2000),
  add column flue_center_height_cm numeric(4, 1) check (flue_center_height_cm between 1 and 500),
  add column external_air_supply boolean,
  add column new_firebox boolean,
  add column thermostat boolean,
  add column efficiency_percent numeric(4, 1) check (efficiency_percent between 1 and 100),
  add column energy_label text check (energy_label in ('A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G')),
  add column warranty_years integer check (warranty_years between 0 and 50),
  add column material text check (char_length(material) between 1 and 100),
  add column description text check (char_length(description) between 1 and 5000),
  add constraint stoves_power_range check (min_power_kw is null or max_power_kw is null or min_power_kw <= max_power_kw);

-- Many stoves connect at the top and the rear. The code in production before this migration only
-- knows 'top' and 'rear'; it shows no outlet for 'both' and asks for a choice when editing.
alter table public.stoves drop constraint stoves_flue_outlet_check;
alter table public.stoves add constraint stoves_flue_outlet_check check (flue_outlet in ('top', 'rear', 'both'));

grant
  insert (product_name, stove_type, power_kw, min_power_kw, max_power_kw, weight_kg, flue_center_height_cm,
          external_air_supply, new_firebox, thermostat, efficiency_percent, energy_label, warranty_years,
          material, description),
  update (product_name, stove_type, power_kw, min_power_kw, max_power_kw, weight_kg, flue_center_height_cm,
          external_air_supply, new_firebox, thermostat, efficiency_percent, energy_label, warranty_years,
          material, description)
  on public.stoves to authenticated;
