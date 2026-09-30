import { STOCK_QUANTITY } from "../stoves";
import { shopProductDetails, type ShopProductForImport } from "./import-mapping";

// Turns a WooCommerce product into changes for the stove it belongs to. Pure, so it can be tested
// without the shop; see docs/woocommerce-sync.md ("Fetching everything from the shop by hand").

export type ShopProductState = ShopProductForImport & { status: string };

export type CurrentStove = {
  condition: "new" | "used" | null;
  made_to_order: boolean;
  stock_quantity: number;
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

// Everything the shop describes. Values the shop leaves empty or that cannot be read keep the app's
// value, so a stove never loses details through a shop edit. The title is not taken over: the app
// names products after brand and model, and the model is not derived from the title.
export function stoveChangesFromShop(product: ShopProductState, stove: CurrentStove): StoveChanges {
  const { model: _model, product_name: _title, brand, ...details } = shopProductDetails(product);
  const changes: StoveChanges = {};
  for (const [key, value] of Object.entries(details)) {
    if (value !== null) changes[key] = value;
  }
  if (brand !== UNKNOWN) changes.brand = brand;

  const condition = (changes.condition as CurrentStove["condition"] | undefined) ?? stove.condition;
  Object.assign(changes, stockChanges(product, condition, stove.stock_quantity));
  // The database unlists sold-out stoves anyway; saying so here keeps the changes accurate.
  changes.shop_listed = product.status === "publish" && (changes.made_to_order === true || changes.stock_quantity !== 0);
  return changes;
}
