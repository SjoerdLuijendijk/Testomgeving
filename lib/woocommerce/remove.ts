import { getWooCommerceConfig, WooCommerceError, wooRequest } from "./client";
import { findProduct } from "./sync";

// Server-only. Moves a stove's web shop product to the WordPress trash (not deleted permanently,
// so it can be restored there). Only called when a team member explicitly asks for it.
export async function trashShopProduct(productId: number | null, stoveNumber: number): Promise<void> {
  const config = getWooCommerceConfig();
  if (!config) throw new WooCommerceError("De webshopkoppeling is niet ingesteld, dus de kachel kan niet uit de webshop worden gehaald.");

  const product = await findProduct(config, productId, String(stoveNumber));
  if (!product) return; // Not in the shop (any more): nothing to remove.
  await wooRequest(config, "DELETE", `/products/${product.id}`);
}
