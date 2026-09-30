import type { SupabaseClient } from "@supabase/supabase-js";
import { signPhotoUrls } from "./stove-photos";
import type { Stove, StoveDetails } from "./stoves";

const DETAIL_COLUMNS =
  "number, brand, model, condition, height_cm, width_cm, depth_cm, flue_outlet, flue_diameter_mm, price_cents, product_name, stove_type, power_kw, min_power_kw, max_power_kw, weight_kg, flue_center_height_cm, external_air_supply, new_firebox, thermostat, efficiency_percent, energy_label, warranty_years, material, description, shop_listed, shop_sync_error, shop_sync_enabled, marketplace_listed, made_to_order, stock_quantity, sold_at, created_at";

type DetailsRow = {
  number: number;
  brand: string;
  model: string;
  condition: StoveDetails["condition"];
  height_cm: number | null;
  width_cm: number | null;
  depth_cm: number | null;
  flue_outlet: StoveDetails["flueOutlet"];
  flue_diameter_mm: number | null;
  price_cents: number | null;
  product_name: string | null;
  stove_type: StoveDetails["stoveType"];
  power_kw: number | null;
  min_power_kw: number | null;
  max_power_kw: number | null;
  weight_kg: number | null;
  flue_center_height_cm: number | null;
  external_air_supply: boolean | null;
  new_firebox: boolean | null;
  thermostat: boolean | null;
  efficiency_percent: number | null;
  energy_label: StoveDetails["energyLabel"];
  warranty_years: number | null;
  material: string | null;
  description: string | null;
  shop_listed: boolean;
  shop_sync_error: string | null;
  shop_sync_enabled: boolean;
  marketplace_listed: boolean;
  made_to_order: boolean;
  stock_quantity: number;
  sold_at: string | null;
  created_at: string;
};

function toStoveDetails(row: DetailsRow): StoveDetails {
  return {
    number: row.number,
    brand: row.brand,
    model: row.model,
    condition: row.condition,
    heightCm: row.height_cm,
    widthCm: row.width_cm,
    depthCm: row.depth_cm,
    flueOutlet: row.flue_outlet,
    flueDiameterMm: row.flue_diameter_mm,
    priceCents: row.price_cents,
    productName: row.product_name,
    stoveType: row.stove_type,
    powerKw: row.power_kw,
    minPowerKw: row.min_power_kw,
    maxPowerKw: row.max_power_kw,
    weightKg: row.weight_kg,
    flueCenterHeightCm: row.flue_center_height_cm,
    externalAirSupply: row.external_air_supply,
    newFirebox: row.new_firebox,
    thermostat: row.thermostat,
    efficiencyPercent: row.efficiency_percent,
    energyLabel: row.energy_label,
    warrantyYears: row.warranty_years,
    material: row.material,
    description: row.description,
    shopListed: row.shop_listed,
    shopSyncError: row.shop_sync_error,
    shopSyncEnabled: row.shop_sync_enabled,
    marketplaceListed: row.marketplace_listed,
    madeToOrder: row.made_to_order,
    stockQuantity: row.stock_quantity,
    soldAt: row.sold_at,
    createdAt: row.created_at,
  };
}

export async function getStoves(supabase: SupabaseClient): Promise<Stove[]> {
  const { data, error } = await supabase
    .from("stoves")
    .select(`${DETAIL_COLUMNS}, stove_photos (id, path), invoices (id, invoice_number)`)
    .order("number", { ascending: false })
    .order("id", { referencedTable: "stove_photos", ascending: true })
    .order("id", { referencedTable: "invoices", ascending: true });
  if (error) throw error;

  const urlByPath = await signPhotoUrls(supabase, data.flatMap((stove) => stove.stove_photos.map((photo) => photo.path)));

  return data.map((stove) => ({
    ...toStoveDetails(stove as DetailsRow),
    invoices: stove.invoices.map((invoice) => ({ id: invoice.id, number: invoice.invoice_number })),
    photos: stove.stove_photos.map((photo) => ({ id: photo.id, url: urlByPath.get(photo.path) ?? null })),
  }));
}

// Null: the stove does not exist (or is not visible to the caller).
export async function getStoveDetails(supabase: SupabaseClient, number: number): Promise<StoveDetails | null> {
  const { data, error } = await supabase.from("stoves").select(DETAIL_COLUMNS).eq("number", number).maybeSingle();
  if (error) throw error;
  return data ? toStoveDetails(data as DetailsRow) : null;
}

// Photo ids and storage paths in upload order.
export async function getStovePhotoPaths(supabase: SupabaseClient, number: number): Promise<{ id: number; path: string }[]> {
  const { data, error } = await supabase.from("stove_photos").select("id, path").eq("stove_number", number).order("id");
  if (error) throw error;
  return data;
}

export async function getKnownBrands(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("stoves").select("brand").limit(1000);
  if (error) throw error;
  return [...new Set(data.map((row) => row.brand))].sort((a, b) => a.localeCompare(b, "nl"));
}
