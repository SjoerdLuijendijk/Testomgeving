import { stoveProductName } from "../stove-specs";
import { STOCK_QUANTITY, type StoveType } from "../stoves";
import { shopProductDetails, type ShopProductForImport } from "./import-mapping";

// Turns a WooCommerce product into changes for the stove it belongs to. Pure, so it can be tested
// without the shop; see docs/woocommerce-sync.md ("Shop changes back to the app").

export type ShopProductState = ShopProductForImport & { status: string; date_modified_gmt?: string | null };

export type CurrentStove = {
  condition: "new" | "used" | null;
  made_to_order: boolean;
  stock_quantity: number;
  brand: string;
  model: string;
  stove_type: StoveType | null;
  product_name: string | null;
};

export type StoveChanges = Record<string, string | number | boolean | null>;

const UNKNOWN = "Onbekend";

function stockChanges(product: ShopProductState, condition: CurrentStove["condition"], currentStock: number): StoveChanges {
  if (!product.manage_stock) {
    if (product.stock_status === "onbackorder" && condition === "new") return { made_to_order: true };
    if (product.stock_status === "outofstock") return { made_to_order: false, stock_quantity: 0 };
    return { made_to_order: false, stock_quantity: condition === "used" || currentStock < 1 ? 1 : currentStock };
  }
  const quantity = Math.min(Math.max(product.stock_quantity ?? 0, 0), condition === "used" ? 1 : STOCK_QUANTITY.max);
  return { made_to_order: false, stock_quantity: quantity };
}

// Only the stock, for orders: the rest of the product did not change.
export function stockChangesFromShop(product: ShopProductState, stove: CurrentStove): StoveChanges {
  return stockChanges(product, stove.condition, stove.stock_quantity);
}

// Everything the shop describes. Values the shop leaves empty or that cannot be read keep the app's
// value, so a stove never loses details through a shop edit. The model is not taken from the title.
export function stoveChangesFromShop(product: ShopProductState, stove: CurrentStove): StoveChanges {
  const { model: _model, product_name: title, brand, ...details } = shopProductDetails(product);
  const changes: StoveChanges = {};
  for (const [key, value] of Object.entries(details)) {
    if (value !== null) changes[key] = value;
  }
  if (brand !== UNKNOWN) changes.brand = brand;
  // The app's generated title ("Speksteenkachel Hark 44") is not a name of its own.
  if (title !== stoveProductName({ productName: stove.product_name, stoveType: stove.stove_type, brand: stove.brand, model: stove.model })) {
    changes.product_name = title;
  }

  const condition = (changes.condition as CurrentStove["condition"] | undefined) ?? stove.condition;
  Object.assign(changes, stockChanges(product, condition, stove.stock_quantity));
  // The database unlists sold-out stoves anyway; saying so here keeps the changes accurate.
  changes.shop_listed = product.status === "publish" && (changes.made_to_order === true || changes.stock_quantity !== 0);
  return changes;
}

// True when the product was last changed before (or by) the app's own latest push to the shop, so
// the delivery is only the echo of that push and the app already has these values.
export function isEchoOfAppPush(product: ShopProductState, shopSyncedAt: string | null) {
  if (!shopSyncedAt || !product.date_modified_gmt) return false;
  const modified = Date.parse(`${product.date_modified_gmt}Z`);
  return Number.isFinite(modified) && modified <= Date.parse(shopSyncedAt);
}
