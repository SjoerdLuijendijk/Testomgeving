"use server";

import { revalidatePath } from "next/cache";
import { requireTeamMember } from "../lib/auth";
import { parseStockQuantity, parseStoveFields } from "../lib/stove-fields";
import { PHOTOS_BUCKET } from "../lib/stoves";
import { readPhotos, storePhotos, UserError } from "../lib/stove-photos";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const NO_ACCESS = { ok: false, error: "Je hebt geen toegang tot de voorraad." } as const;
// Postgres error code for a violated check constraint.
const CHECK_VIOLATION = "23514";

function errorMessage(error: unknown) {
  // Database and storage details are not shown to the user.
  return error instanceof UserError ? error.message : "Er ging iets mis. Probeer het opnieuw.";
}

function isPositiveId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export async function addStove(formData: FormData): Promise<ActionResult<{ number: number; warning?: string }>> {
  const fields = parseStoveFields(formData);
  if (!fields.ok) return fields;
  const quantity = parseStockQuantity(formData, fields.values.condition);
  if (!quantity.ok) return quantity;

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return NO_ACCESS;

  let photos: Uint8Array[];
  try {
    photos = await readPhotos(formData);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  const { data: stove, error } = await supabase
    .from("stoves")
    .insert({ ...fields.values, stock_quantity: quantity.value })
    .select("number")
    .single();
  if (error) return { ok: false, error: errorMessage(error) };

  revalidatePath("/");
  try {
    await storePhotos(supabase, stove.number, photos);
  } catch {
    return { ok: true, number: stove.number, warning: "Niet alle foto's zijn opgeslagen. Voeg ze toe via de voorraad." };
  }

  return { ok: true, number: stove.number };
}

export async function updateStove(stoveNumber: number, formData: FormData): Promise<ActionResult> {
  if (!isPositiveId(stoveNumber)) return { ok: false, error: "Onbekende kachel." };
  const fields = parseStoveFields(formData);
  if (!fields.ok) return fields;

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return NO_ACCESS;

  const { data, error } = await supabase.from("stoves").update(fields.values).eq("number", stoveNumber).select("number");
  if (error?.code === CHECK_VIOLATION) {
    return { ok: false, error: "Deze kachel heeft meer dan 1 op voorraad en kan daarom niet op gebruikt worden gezet." };
  }
  if (error) return { ok: false, error: errorMessage(error) };
  if (data.length === 0) return { ok: false, error: "Deze kachel bestaat niet meer." };

  revalidatePath("/");
  return { ok: true };
}

export async function addStovePhotos(stoveNumber: number, formData: FormData): Promise<ActionResult> {
  if (!isPositiveId(stoveNumber)) return { ok: false, error: "Onbekende kachel." };

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return NO_ACCESS;

  try {
    await storePhotos(supabase, stoveNumber, await readPhotos(formData));
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  } finally {
    revalidatePath("/");
  }
  return { ok: true };
}

// Sells (-1) or restocks (+1) one unit; the stove counts as sold once its stock reaches 0.
export async function adjustStoveStock(stoveNumber: number, delta: -1 | 1): Promise<ActionResult> {
  if (!isPositiveId(stoveNumber) || (delta !== -1 && delta !== 1)) return { ok: false, error: "Onbekende kachel." };

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return NO_ACCESS;

  const { data, error } = await supabase.rpc("adjust_stove_stock", { p_stove_number: stoveNumber, p_delta: delta });
  if (error?.code === CHECK_VIOLATION) {
    return {
      ok: false,
      error: delta === -1 ? "Deze kachel is al uitverkocht." : "Een gebruikte kachel kan maar 1 keer op voorraad staan.",
    };
  }
  if (error) return { ok: false, error: errorMessage(error) };
  if (data === null) return { ok: false, error: "Deze kachel bestaat niet meer." };

  revalidatePath("/");
  return { ok: true };
}

export async function setStoveShopListed(stoveNumber: number, listed: boolean): Promise<ActionResult> {
  if (!isPositiveId(stoveNumber) || typeof listed !== "boolean") return { ok: false, error: "Onbekende kachel." };

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return NO_ACCESS;

  const { data, error } = await supabase.from("stoves").update({ shop_listed: listed }).eq("number", stoveNumber).select("number");
  if (error) return { ok: false, error: errorMessage(error) };
  if (data.length === 0) return { ok: false, error: "Deze kachel bestaat niet meer." };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteStovePhoto(photoId: number): Promise<ActionResult> {
  if (!isPositiveId(photoId)) return { ok: false, error: "Onbekende foto." };

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return NO_ACCESS;

  const { data: photo, error } = await supabase.from("stove_photos").select("path").eq("id", photoId).single();
  if (error) return { ok: false, error: errorMessage(error) };

  const { error: removeError } = await supabase.storage.from(PHOTOS_BUCKET).remove([photo.path]);
  if (removeError) return { ok: false, error: errorMessage(removeError) };

  const { error: deleteError } = await supabase.from("stove_photos").delete().eq("id", photoId);
  if (deleteError) return { ok: false, error: errorMessage(deleteError) };

  revalidatePath("/");
  return { ok: true };
}
