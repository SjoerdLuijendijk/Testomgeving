import type { SupabaseClient } from "@supabase/supabase-js";
import { syncStoveToShop } from "./sync";

// Server-only. Linking lets the app update a stove's web shop product (shop_sync_enabled) and
// updates it right away. Stoves imported from the shop start unlinked.

export type LinkResult = { ok: true } | { ok: false; notFound?: true; error: string };
export type LinkBatchResult = {
  linked: number[];
  failed: { number: number; reason: string }[];
  /** Unlinked stoves still waiting after this batch. */
  remaining: number;
};

// Uploading the photos to the shop takes a while per stove, so a batch stays small.
const BATCH_SIZE = 2;

export async function linkStove(supabase: SupabaseClient, stoveNumber: number): Promise<LinkResult> {
  const { data, error } = await supabase.from("stoves").update({ shop_sync_enabled: true }).eq("number", stoveNumber).select("number");
  if (error) throw error;
  if (data.length === 0) return { ok: false, notFound: true, error: "Deze kachel bestaat niet meer." };

  const syncError = await syncStoveToShop(supabase, stoveNumber);
  return syncError ? { ok: false, error: syncError } : { ok: true };
}

export async function countUnlinkedStoves(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase.from("stoves").select("number", { count: "exact", head: true }).eq("shop_sync_enabled", false);
  if (error) throw error;
  return count ?? 0;
}

// Links the next few unlinked stoves. A stove whose shop update fails stays linked, with the error
// shown in the inventory ("⚠ Opnieuw"), so the next batch moves on to other stoves.
export async function linkNextStoves(supabase: SupabaseClient): Promise<LinkBatchResult> {
  const { data, error } = await supabase.from("stoves").select("number").eq("shop_sync_enabled", false).order("number").limit(BATCH_SIZE);
  if (error) throw error;

  const result: LinkBatchResult = { linked: [], failed: [], remaining: 0 };
  for (const { number } of data) {
    const outcome = await linkStove(supabase, number);
    if (outcome.ok) result.linked.push(number);
    else if (!outcome.notFound) result.failed.push({ number, reason: outcome.error });
  }
  result.remaining = await countUnlinkedStoves(supabase);
  return result;
}
