import type { SupabaseClient } from "@supabase/supabase-js";
import { getWooCommerceConfig, WooCommerceError, wooRequest } from "./client";
import { importProduct, type ImportBatchResult, type ShopProduct } from "./import";
import { mapShopProduct } from "./import-mapping";
import { STOVE_NUMBER_META_KEY } from "./product";
import { isEchoOfAppPush, stockChangesFromShop, stoveChangesFromShop, type CurrentStove, type ShopProductState } from "./shop-changes";

// Server-only. Takes a WooCommerce product change over into the app. Runs from the webhook with
// the admin client, so it only ever writes the columns listed in shop-changes.ts. The product is
// always fetched from the shop again instead of trusting the delivery's copy, which may be outdated.

type Config = NonNullable<ReturnType<typeof getWooCommerceConfig>>;
type ShopProductWithMeta = ShopProduct & ShopProductState & { meta_data?: { key: string; value: unknown }[] };
type StoveRow = CurrentStove & { number: number; shop_synced_at: string | null; shop_listed: boolean };

const STOVE_COLUMNS = "number, condition, made_to_order, stock_quantity, brand, model, stove_type, product_name, shop_synced_at, shop_listed";

async function fetchProduct(config: Config, productId: number) {
  try {
    return await wooRequest<ShopProductWithMeta>(config, "GET", `/products/${productId}`);
  } catch (error) {
    // Deleted permanently in WordPress.
    if (error instanceof WooCommerceError && error.status === 404) return null;
    throw error;
  }
}

// The stove linked to the product, or the stove the app made the product for (marked with its number).
async function findStove(admin: SupabaseClient, productId: number, product: ShopProductWithMeta | null): Promise<StoveRow | null> {
  const linked = await admin.from("stoves").select(STOVE_COLUMNS).eq("shop_product_id", productId).limit(2);
  if (linked.error) throw linked.error;
  if (linked.data.length === 1) return linked.data[0] as StoveRow;
  if (linked.data.length > 1 || !product) return null;

  const marker = product.meta_data?.find(({ key }) => key === STOVE_NUMBER_META_KEY);
  const number = Number(marker?.value);
  if (!Number.isSafeInteger(number) || String(number) !== product.sku.trim()) return null;
  const marked = await admin.from("stoves").select(STOVE_COLUMNS).eq("number", number).is("shop_product_id", null).maybeSingle();
  if (marked.error) throw marked.error;
  return marked.data as StoveRow | null;
}

async function importNewProduct(admin: SupabaseClient, config: Config, product: ShopProductWithMeta) {
  if (product.status !== "publish" || !mapShopProduct(product).ok) return;
  const result: ImportBatchResult = { imported: [], warnings: [], failed: [], skipped: [], remaining: 0 };
  await importProduct(admin, config, product, result);
  // Numbers and reasons only; no product contents.
  for (const issue of [...result.failed, ...result.warnings]) console.error("Importing new shop product", { sku: issue.sku, reason: issue.reason });
}

export async function applyShopProduct(admin: SupabaseClient, config: Config, productId: number, { stockOnly }: { stockOnly: boolean }) {
  const product = await fetchProduct(config, productId);
  const stove = await findStove(admin, productId, product);

  if (!stove) {
    // A product made in WordPress: it becomes a stove like an imported one (unlinked).
    if (product && !stockOnly) await importNewProduct(admin, config, product);
    return;
  }

  let changes;
  if (!product || product.status === "trash") {
    changes = stove.shop_listed ? { shop_listed: false } : null;
  } else if (stockOnly) {
    changes = stockChangesFromShop(product, stove);
  } else if (isEchoOfAppPush(product, stove.shop_synced_at)) {
    changes = null;
  } else {
    changes = { ...stoveChangesFromShop(product, stove), shop_product_id: productId };
  }
  if (!changes) return;

  const { error } = await admin.from("stoves").update(changes).eq("number", stove.number);
  if (error) {
    console.error("Taking over a shop change failed", { stoveNumber: stove.number, code: error.code });
    throw error;
  }
}
