"use server";

import { requireTeamMember } from "../lib/auth";
import { getCompany } from "../lib/invoice-queries";
import { AdGenerationError, generateMarketplaceAd } from "../lib/marketplace-ad";
import { getStoveForAd } from "../lib/stove-queries";
import type { ActionResult } from "./actions";

function isPositiveId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

// Builds the ad from the stored stove data, never from values sent by the browser.
export async function createMarketplaceAd(stoveNumber: number): Promise<ActionResult<{ text: string }>> {
  if (!isPositiveId(stoveNumber)) return { ok: false, error: "Onbekende kachel." };

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return { ok: false, error: "Je hebt geen toegang tot de voorraad." };

  try {
    const [stove, company] = await Promise.all([getStoveForAd(supabase, stoveNumber), getCompany(supabase)]);
    if (!stove) return { ok: false, error: "Kachel niet gevonden." };
    return { ok: true, text: await generateMarketplaceAd(stove, company) };
  } catch (error) {
    if (error instanceof AdGenerationError) return { ok: false, error: error.message };
    console.error("Creating marketplace ad failed", { code: (error as { code?: unknown })?.code });
    return { ok: false, error: "Er ging iets mis. Probeer het opnieuw." };
  }
}
