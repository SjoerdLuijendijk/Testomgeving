"use server";

import { revalidatePath } from "next/cache";
import { requireTeamMember } from "../lib/auth";
import { WooCommerceError } from "../lib/woocommerce/client";
import { importShopBatch, type ImportBatchResult } from "../lib/woocommerce/import";
import { linkNextStoves, type LinkBatchResult } from "../lib/woocommerce/link";
import { refreshStockFromShop, type StockRefreshResult } from "../lib/woocommerce/stock-refresh";

export type ImportActionResult = ({ ok: true } & ImportBatchResult) | { ok: false; error: string };
export type LinkActionResult = ({ ok: true } & LinkBatchResult) | { ok: false; error: string };
export type StockRefreshActionResult = ({ ok: true } & StockRefreshResult) | { ok: false; error: string };

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

// Links the next few unlinked (imported) stoves to the web shop and updates their products; the
// settings page repeats it until none remain. Changes the shop, so the page asks for confirmation.
export async function linkAllStovesToShop(): Promise<LinkActionResult> {
  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return { ok: false, error: "Je hebt geen toegang tot de voorraad." };

  try {
    const result = await linkNextStoves(supabase);
    revalidatePath("/");
    return { ok: true, ...result };
  } catch (error) {
    console.error("Linking stoves to the web shop failed", { code: (error as { code?: unknown })?.code });
    return { ok: false, error: "Het koppelen is mislukt. Probeer het opnieuw." };
  }
}

// Sets the app's stock to the web shop's stock for all stoves with a shop product. Only reads from
// the shop; the admin page asks for confirmation because it changes the app's stock.
export async function refreshStockFromShopAction(): Promise<StockRefreshActionResult> {
  const { supabase, isMember } = await requireTeamMember();
  if (!isMember) return { ok: false, error: "Je hebt geen toegang tot de voorraad." };

  try {
    const result = await refreshStockFromShop(supabase);
    if (result.changed.length > 0) revalidatePath("/");
    return { ok: true, ...result };
  } catch (error) {
    if (!(error instanceof WooCommerceError)) console.error("Refreshing stock from the shop failed", { code: (error as { code?: unknown })?.code });
    return { ok: false, error: error instanceof WooCommerceError ? error.message : "Het bijwerken van de voorraad is mislukt. Probeer het opnieuw." };
  }
}
