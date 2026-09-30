import type { SupabaseClient } from "@supabase/supabase-js";
import { getWooCommerceConfig, WooCommerceError, wooRequest } from "./client";
import { stockChangesFromShop, type CurrentStove, type ShopProductState } from "./shop-changes";

// Server-only. Sets the app's stock of every stove with a web shop product to the shop's stock, in
// one go, with the team member's own client. Only reads from the shop; nothing else of the stove
// changes. Uses the same stock rules as the webhook (shop-changes.ts).

type StoveRow = CurrentStove & { number: number; shop_product_id: number; shop_sync_error: string | null };
type StockState = { stockQuantity: number; madeToOrder: boolean };

export type StockChange = { number: number; from: StockState; to: StockState };
export type StockRefreshResult = {
  changed: StockChange[];
  unchanged: number;
  skipped: { number: number; reason: string }[];
};

// WooCommerce returns at most 100 products per page.
const PAGE_SIZE = 100;
const STOVE_COLUMNS = "number, condition, made_to_order, stock_quantity, brand, model, stove_type, product_name, shop_product_id, shop_sync_error";

async function fetchProducts(config: NonNullable<ReturnType<typeof getWooCommerceConfig>>, ids: number[]) {
  const products = new Map<number, ShopProductState & { id: number }>();
  for (let start = 0; start < ids.length; start += PAGE_SIZE) {
    const chunk = ids.slice(start, start + PAGE_SIZE);
    const page = await wooRequest<(ShopProductState & { id: number })[]>(
      config,
      "GET",
      `/products?status=any&per_page=${PAGE_SIZE}&include=${chunk.join(",")}`,
    );
    for (const product of page) products.set(product.id, product);
  }
  return products;
}

export async function refreshStockFromShop(supabase: SupabaseClient): Promise<StockRefreshResult> {
  const config = getWooCommerceConfig();
  if (!config) throw new WooCommerceError("De webshopkoppeling is nog niet ingesteld.");

  const { data, error } = await supabase.from("stoves").select(STOVE_COLUMNS).not("shop_product_id", "is", null).order("number");
  if (error) throw error;
  const stoves = data as StoveRow[];
  const products = await fetchProducts(config, [...new Set(stoves.map((stove) => stove.shop_product_id))]);

  const result: StockRefreshResult = { changed: [], unchanged: 0, skipped: [] };
  for (const stove of stoves) {
    // The app has a change the shop has not received yet; the shop's stock would undo it.
    if (stove.shop_sync_error) {
      result.skipped.push({ number: stove.number, reason: "De webshop is nog niet bijgewerkt (⚠ in de voorraad)." });
      continue;
    }
    const product = products.get(stove.shop_product_id);
    if (!product || product.status === "trash") {
      result.skipped.push({ number: stove.number, reason: "Niet (meer) in de webshop." });
      continue;
    }

    const changes = stockChangesFromShop(product, stove);
    const from = { stockQuantity: stove.stock_quantity, madeToOrder: stove.made_to_order };
    const to = {
      madeToOrder: changes.made_to_order === true,
      // The database keeps made-to-order stoves at 1.
      stockQuantity: changes.made_to_order === true ? 1 : typeof changes.stock_quantity === "number" ? changes.stock_quantity : stove.stock_quantity,
    };
    if (from.madeToOrder === to.madeToOrder && from.stockQuantity === to.stockQuantity) {
      result.unchanged++;
      continue;
    }

    const { error: updateError } = await supabase.from("stoves").update(changes).eq("number", stove.number);
    if (updateError) {
      console.error("Refreshing stock from the shop failed", { stoveNumber: stove.number, code: updateError.code });
      result.skipped.push({ number: stove.number, reason: "Opslaan in de app is mislukt." });
      continue;
    }
    result.changed.push({ number: stove.number, from, to });
  }
  return result;
}
