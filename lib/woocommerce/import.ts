import type { SupabaseClient } from "@supabase/supabase-js";
import { isJpeg, storePhotos } from "../stove-photos";
import { MAX_PHOTO_BYTES } from "../stoves";
import { getWooCommerceConfig, storeApiRequest, WooCommerceError, wooRequest } from "./client";
import { decodeEntities, mapShopProduct, type ShopProductForImport } from "./import-mapping";

// Server-only. Imports the shop's published products as stoves, one product or a small batch per
// call so each call stays well within the function time limit. Stoves that already exist are
// skipped, so the import can be repeated safely. The import only reads from the shop, and the
// imported stoves start unlinked (shop_sync_enabled false), so the shop does not change.

type Config = NonNullable<ReturnType<typeof getWooCommerceConfig>>;
export type ShopProduct = ShopProductForImport & { images: { id: number }[] };
type StoreImage = { id: number; src: string; srcset: string };

export type ImportIssue = { sku: string; name: string; reason: string };
export type ImportBatchResult = {
  imported: { number: number; name: string }[];
  warnings: ImportIssue[];
  failed: ImportIssue[];
  /** Products that are never imported, such as fire bowls. */
  skipped: ImportIssue[];
  /** Importable products still waiting after this batch. */
  remaining: number;
};

const BATCH_SIZE = 4;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const DOWNLOAD_TIMEOUT_MS = 30_000;
// WordPress makes smaller copies of each photo; the app keeps photos up to about this width.
const PREFERRED_MAX_WIDTH = 1600;

async function listPublishedProducts(config: Config) {
  const products: ShopProduct[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await wooRequest<ShopProduct[]>(config, "GET", `/products?status=publish&per_page=${PAGE_SIZE}&page=${page}&orderby=id&order=asc`);
    products.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return products;
}

// Candidate photo URLs for one image, largest first but not above the preferred width.
function photoCandidates(image: StoreImage) {
  const sizes = image.srcset
    .split(",")
    .map((entry) => entry.trim().split(/\s+/))
    .map(([url, width]) => ({ url, width: Number.parseInt(width ?? "", 10) }))
    .filter(({ url, width }) => url && Number.isFinite(width))
    .sort((a, b) => b.width - a.width);
  const fitting = sizes.filter(({ width }) => width <= PREFERRED_MAX_WIDTH);
  const urls = [...fitting, ...sizes.filter(({ width }) => width > PREFERRED_MAX_WIDTH).reverse()].map(({ url }) => url);
  return [...new Set(urls.length > 0 ? urls : [image.src])];
}

// Only JPEGs from the shop's own address are accepted, within the app's photo size limit.
async function downloadPhoto(config: Config, image: StoreImage): Promise<Uint8Array | null> {
  for (const url of photoCandidates(image)) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (parsed.origin !== config.origin) continue;
    try {
      const response = await fetch(parsed, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), cache: "no-store" });
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length <= MAX_PHOTO_BYTES && isJpeg(bytes)) return bytes;
    } catch {
      // Try the next size.
    }
  }
  return null;
}

export async function importProduct(supabase: SupabaseClient, config: Config, product: ShopProduct, result: ImportBatchResult) {
  const mapping = mapShopProduct(product);
  const issue = { sku: product.sku, name: decodeEntities(product.name) };
  if (!mapping.ok) {
    result.failed.push({ ...issue, reason: mapping.reason });
    return;
  }
  const { row } = mapping;

  // Download first, so a stove is only created when its photos are in hand.
  const storeProduct = await storeApiRequest<{ images: StoreImage[] }>(config, `/products/${product.id}`).catch(() => null);
  const storeImages = new Map((storeProduct?.images ?? []).map((image) => [image.id, image]));
  const photos: { bytes: Uint8Array }[] = [];
  let missingPhotos = 0;
  for (const { id } of product.images) {
    const image = storeImages.get(id);
    const bytes = image ? await downloadPhoto(config, image) : null;
    if (bytes) photos.push({ bytes });
    else missingPhotos++;
  }

  const { error } = await supabase.from("stoves").insert(row);
  if (error) {
    console.error("Importing shop product failed", { sku: product.sku, code: error.code });
    result.failed.push({ ...issue, reason: error.code === "23505" ? "Dit kachelnummer bestaat al." : "Opslaan in de app is mislukt." });
    return;
  }
  result.imported.push({ number: row.number, name: row.product_name });

  try {
    await storePhotos(supabase, row.number, photos.map((photo) => photo.bytes));
  } catch (storeError) {
    console.error("Storing imported photos failed", { sku: product.sku, code: (storeError as { code?: unknown })?.code });
    result.warnings.push({ ...issue, reason: "De foto's zijn niet opgeslagen. Voeg ze toe via de voorraad." });
    return;
  }
  if (missingPhotos > 0) result.warnings.push({ ...issue, reason: `${missingPhotos} foto('s) konden niet worden overgenomen.` });
}

// Imports the published shop product with the given SKU, or else the next batch of published
// products that are not in the app yet.
export async function importShopBatch(supabase: SupabaseClient, onlySku?: string): Promise<ImportBatchResult> {
  const config = getWooCommerceConfig();
  if (!config) throw new WooCommerceError("De webshopkoppeling is nog niet ingesteld.");

  const products = (await listPublishedProducts(config)).filter((product) => !onlySku || product.sku.trim() === onlySku);
  if (onlySku && products.length === 0) throw new WooCommerceError(`Geen online product met webshopnummer ${onlySku} gevonden.`);
  const result: ImportBatchResult = { imported: [], warnings: [], failed: [], skipped: [], remaining: 0 };

  const numbers = products.map((product) => Number(product.sku)).filter(Number.isSafeInteger);
  const { data: existing, error } = await supabase.from("stoves").select("number").in("number", numbers);
  if (error) throw error;
  const existingNumbers = new Set(existing.map((stove) => stove.number));
  if (onlySku && existingNumbers.has(Number(onlySku))) throw new WooCommerceError(`Kachel ${onlySku} staat al in de app.`);

  const pending: ShopProduct[] = [];
  for (const product of products) {
    if (existingNumbers.has(Number(product.sku))) continue;
    const mapping = mapShopProduct(product);
    if (mapping.ok) pending.push(product);
    else result.skipped.push({ sku: product.sku, name: decodeEntities(product.name), reason: mapping.reason });
  }

  for (const product of pending.slice(0, BATCH_SIZE)) await importProduct(supabase, config, product, result);
  result.remaining = pending.length - Math.min(pending.length, BATCH_SIZE);
  return result;
}
