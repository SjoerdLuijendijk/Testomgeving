"use server";

import { revalidatePath } from "next/cache";
import { requireTeamMember } from "../lib/auth";
import { PHOTOS_BUCKET, MAX_TEXT_LENGTH } from "../lib/stoves";
import { readPhotos, storePhotos, UserError } from "../lib/stove-photos";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const NO_ACCESS = { ok: false, error: "Je hebt geen toegang tot de voorraad." } as const;

function errorMessage(error: unknown) {
  // Database and storage details are not shown to the user.
  return error instanceof UserError ? error.message : "Er ging iets mis. Probeer het opnieuw.";
}

function readText(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value.length > 0 && value.length <= MAX_TEXT_LENGTH ? value : null;
}

function isPositiveId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export async function addStove(formData: FormData): Promise<ActionResult<{ number: number; warning?: string }>> {
  const brand = readText(formData, "brand");
  const model = readText(formData, "model");
  if (!brand || !model) return { ok: false, error: "Vul merk en model in." };

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return NO_ACCESS;

  let photos: Uint8Array[];
  try {
    photos = await readPhotos(formData);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  const { data: stove, error } = await supabase.from("stoves").insert({ brand, model }).select("number").single();
  if (error) return { ok: false, error: errorMessage(error) };

  revalidatePath("/");
  try {
    await storePhotos(supabase, stove.number, photos);
  } catch {
    return { ok: true, number: stove.number, warning: "Niet alle foto's zijn opgeslagen. Voeg ze toe via de voorraad." };
  }

  return { ok: true, number: stove.number };
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

export async function setStoveSold(stoveNumber: number, sold: boolean): Promise<ActionResult> {
  if (!isPositiveId(stoveNumber) || typeof sold !== "boolean") return { ok: false, error: "Onbekende kachel." };

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return NO_ACCESS;

  const { error } = await supabase
    .from("stoves")
    .update({ sold_at: sold ? new Date().toISOString() : null })
    .eq("number", stoveNumber);
  if (error) return { ok: false, error: errorMessage(error) };

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
