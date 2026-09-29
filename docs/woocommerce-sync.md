# WooCommerce sync

Status: design only. The shop sync itself is not built yet; only the `shop_listed` flag exists.

## Direction

- The app is the source of truth for stock. Stoves are entered in the app; the sync creates or
  updates the matching WooCommerce product.
- WooCommerce reports sales back. A web shop order marks the stove as sold (`sold_at`) in the app.
- Only stoves with `shop_listed = true` ("Online" in the inventory) are offered in the shop.

## Matching

The six-digit stove number is the WooCommerce product SKU. Before the sync goes live, existing
WooCommerce products for stoves must have their stove number entered as SKU, so the sync links
them instead of creating duplicates.

## Field mapping (app → WooCommerce)

| App | WooCommerce product | Notes |
| --- | --- | --- |
| `number` | `sku` | Unique key for matching. |
| `brand` + `model` | `name` | For example "Jøtul F 373". |
| `price_cents` | `regular_price` | Incl. VAT, formatted as a decimal string ("1250.00"). Assumes the shop enters prices incl. VAT. |
| `condition` | attribute "Staat" | Nieuw / Gebruikt. |
| `height_cm`, `width_cm`, `depth_cm` | attributes "Hoogte", "Breedte", "Diepte" | In cm. WooCommerce's own `dimensions` could be used instead if shipping needs them. |
| `flue_outlet` | attribute "Rookafvoer" | Boven / Achter. |
| `flue_diameter_mm` | attribute "Maat afvoer" | In mm. |
| photos | `images` | Uploaded once through short-lived signed URLs; WooCommerce keeps its own public copy. |
| — | `manage_stock: true`, `stock_quantity: 1` | Each stove is unique. |

## State rules

| App state | WooCommerce |
| --- | --- |
| `shop_listed` on, not sold | Product published, stock 1. |
| `shop_listed` off | Product set to draft (not deleted, so order history stays intact). |
| Sold (`sold_at` set) | Stock 0 / out of stock. |

## Still to decide (phase 2 and 3)

- WooCommerce REST API keys with the least permissions needed, stored as server-only Vercel
  environment variables.
- Receiving order webhooks: signature verification, a narrowly scoped server-side database
  function to mark a stove as sold, and a Vercel Deployment Protection exception for the webhook
  route only.
