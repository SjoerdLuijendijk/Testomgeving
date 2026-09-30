"use server";

import { revalidatePath } from "next/cache";
import { requireTeamMember } from "../lib/auth";
import { WooCommerceError } from "../lib/woocommerce/client";
import { importShopBatch, type ImportBatchResult } from "../lib/woocommerce/import";

export type ImportActionResult = ({ ok: true } & ImportBatchResult) | { ok: false; error: string };

// Imports one published web shop product by its five-digit number, or without a number the next
// few products; the settings page repeats that until none remain. Only reads from the shop.
export async function importShopStoves(sku?: string): Promise<ImportActionResult> {
  if (sku !== undefined && (typeof sku !== "string" || !/^\d{5}$/.test(sku))) {
    return { ok: false, error: "Vul een webshopnummer van 5 cijfers in, bijvoorbeeld 26118." };
  }

  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return { ok: false, error: "Je hebt geen toegang tot de voorraad." };

  try {
    const result = await importShopBatch(supabase, sku);
    if (result.imported.length > 0) revalidatePath("/");
    return { ok: true, ...result };
  } catch (error) {
    if (!(error instanceof WooCommerceError)) console.error("Web shop import failed", { code: (error as { code?: unknown })?.code });
    return { ok: false, error: error instanceof WooCommerceError ? error.message : "Het importeren is mislukt. Probeer het opnieuw." };
  }
}
