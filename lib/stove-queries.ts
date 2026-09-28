import type { SupabaseClient } from "@supabase/supabase-js";
import { signPhotoUrls } from "./stove-photos";
import type { Stove } from "./stoves";

export async function getStoves(supabase: SupabaseClient): Promise<Stove[]> {
  const { data, error } = await supabase
    .from("stoves")
    .select(
      "number, brand, model, condition, height_cm, width_cm, depth_cm, flue_outlet, flue_diameter_mm, price_cents, sold_at, created_at, stove_photos (id, path), invoices (id, invoice_number)",
    )
    .order("number", { ascending: false })
    .order("id", { referencedTable: "stove_photos", ascending: true })
    .order("id", { referencedTable: "invoices", ascending: true });
  if (error) throw error;

  const urlByPath = await signPhotoUrls(supabase, data.flatMap((stove) => stove.stove_photos.map((photo) => photo.path)));

  return data.map((stove) => ({
    number: stove.number,
    brand: stove.brand,
    model: stove.model,
    condition: stove.condition,
    heightCm: stove.height_cm,
    widthCm: stove.width_cm,
    depthCm: stove.depth_cm,
    flueOutlet: stove.flue_outlet,
    flueDiameterMm: stove.flue_diameter_mm,
    priceCents: stove.price_cents,
    soldAt: stove.sold_at,
    createdAt: stove.created_at,
    invoices: stove.invoices.map((invoice) => ({ id: invoice.id, number: invoice.invoice_number })),
    photos: stove.stove_photos.map((photo) => ({ id: photo.id, url: urlByPath.get(photo.path) ?? null })),
  }));
}

export async function getKnownBrands(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("stoves").select("brand").limit(1000);
  if (error) throw error;
  return [...new Set(data.map((row) => row.brand))].sort((a, b) => a.localeCompare(b, "nl"));
}
