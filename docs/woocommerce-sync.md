# WooCommerce sync

Status: phase 1 is built: the app pushes stoves to the WooCommerce shop (woonwarmer.nl). Web shop
orders do not report back yet (phase 2); a web shop sale must be counted down in the app by hand.

## Configuration

Server-only Vercel environment variables (never `NEXT_PUBLIC_*`):

| Variable | Value |
| --- | --- |
| `WOOCOMMERCE_URL` | The shop's address, e.g. `https://woonwarmer.nl` (HTTPS only). |
| `WOOCOMMERCE_CONSUMER_KEY` | REST API consumer key (`ck_...`). |
| `WOOCOMMERCE_CONSUMER_SECRET` | REST API consumer secret (`cs_...`). |

Create the key in WordPress → WooCommerce → Settings → Advanced → REST API with permission
"Read/Write", linked to a dedicated shop-manager user rather than an administrator where possible.
Without these variables the sync is off; a listed stove then shows "De webshopkoppeling is nog niet
ingesteld." in the inventory.

All environments share one database, so any environment with the variables writes to the live
shop with the same data. Set them for Production and Preview (staging); leave them out of
Development unless testing the sync on purpose.

## How it works

- Code: `lib/woocommerce/` (`client.ts` HTTP and errors, `taxonomy.ts` attributes, terms and
  categories, `product.ts` the product payload, `sync.ts` the sync of one stove).
- Every server action that changes a stove (add, edit, stock, "Webshop" checkbox, photos) schedules
  `syncStoveToShop` with `after()`, so saving never waits for the shop. It runs with the signed-in
  team member's Supabase client, so RLS applies as usual.
- The outcome is stored on the stove: `shop_product_id`, `shop_synced_at` and `shop_sync_error`
  (migration `20260930150000_add_shop_sync_status.sql`). A failure shows "⚠ Opnieuw" next to the
  Webshop checkbox; clicking it runs the sync again right away (`retryShopSync`).
- A stove that was never listed and has no shop product is skipped without calling the shop.
- Only the product's status, key, stock and error code are logged, never request or response bodies.

## Matching

The stove number is the product SKU. The product is found by the stored
`shop_product_id`, else by SKU; otherwise it is created. Products the app creates or updates carry
the meta field `woonwarmer_stove_number`. A product found by a five-digit SKU alone is only used when
it carries that field with the same number; otherwise it belongs to another shop product and the sync
(or deletion) stops with "Nummer … is in de webshop al in gebruik door een ander product." Six-digit
SKUs were only ever created by the app and are accepted without it. If two syncs race to create it,
WooCommerce rejects the duplicate SKU and the second sync updates the first one's product.
A product in the WordPress trash counts as deleted: it is not updated (which would restore it), and
ticking "Webshop" again creates a new product. WooCommerce does not count trashed products when
checking SKUs; should a shop reject the SKU anyway, the sync reports `product_invalid_sku` until the
trashed product is deleted permanently.

## Importing the existing shop products

Rule: nothing in the shop changes without an explicit action by a team member. The import only
reads from the shop.

Instellingen → Webshop (`lib/woocommerce/import.ts`, `import-mapping.ts`) takes over published
products as stoves: one by its five-digit number ("Deze kachel importeren"), or all of them
("Alles importeren"):

- A stove keeps its five-digit shop SKU as its stove number (e.g. 26118), which is also on the
  stove itself. The database allows explicit numbers only in the five-digit range. Stoves added in
  the app get the highest five-digit number ever used plus one, so they continue the shop's
  numbering (migration `20260930233000_continue_shop_stove_numbers.sql`). A number that exists only
  in the shop and not yet in the app can still be handed out; the sync then refuses to touch that
  shop product (see Matching).
- The stove records its product (`shop_product_id`, `shop_listed`) but starts **unlinked**
  (`shop_sync_enabled = false`, migration `20260930190000_add_shop_sync_enabled.sql`): the sync
  skips it entirely. The inventory shows "Koppelen" next to its Webshop checkbox; linking
  (`linkStoveToShop`, after a confirmation) enables the sync and updates the product right away.
  Until then, selling it in the app does not take it offline in the shop.
  "Alles koppelen" in Instellingen → Webshop links all unlinked stoves after a confirmation, two per
  server action call (`lib/woocommerce/link.ts`). A stove whose shop update fails stays linked and
  shows "⚠ Opnieuw"; the run stops when a whole batch fails.
- Details are parsed from the shop's global and product attributes (Merk, Staat kachel, Type kachel,
  Aansluiting, Vermogen, Harthoogte achter, Rendement, Energielabel, Garantie, ...). Values that do
  not make sense are left empty. The model is the product name without SKU prefix, type and brand,
  or "Onbekend". The shop name is kept as the web shop name.
- Photos are downloaded from the shop (a WordPress size of at most about 1600 px, JPEG, within the
  app's photo size limit) and stored in the app. Linking uploads them to the shop again as new
  images named `kachel-<number>-foto-<photo id>`; the old images stay in the media library.
- It runs in batches of four products per server action call; the settings page repeats the call
  until nothing is left. Existing stove numbers are skipped, so it can be run again safely.
- Fire bowls (category "Vuurschalen"), products without a five-digit SKU and out-of-stock products
  are skipped.

Once linked, the app owns the product like any other: linking replaces its attributes, categories
and images with the app's data.

## Field mapping (app → WooCommerce)

The sync owns the products it creates: every sync replaces their name, price, description,
categories, attributes, images and stock. Edits made to those products in WordPress are overwritten.

| App | WooCommerce product | Notes |
| --- | --- | --- |
| `number` | `sku` | Unique key for matching. |
| `product_name`, else `stove_type` + `brand` + `model` | `name` | The shop's names look like "Speksteenkachel Hark". |
| `description` | `description` | Optional free text. |
| `price_cents` | `regular_price` | Incl. VAT, as a decimal string ("1250.00"). Assumes the shop enters prices incl. VAT. |
| `condition` + `stove_type` | `categories` | New: "Nieuwe kachels". Gereviseerd: "Gereviseerde kachels" plus "Houtkachels" or "Speksteenkachels". Matched by slug; a missing category is skipped. |
| `brand` | global attribute "Merk" (`pa_merk`) | Existing terms are matched ignoring case and spaces; a new brand is added as a term. |
| `condition` | global attribute "Staat kachel" (`pa_staat`) | Nieuw / Gereviseerd. |
| `stove_type` | global attribute "Type kachel" (`pa_type-kachel`) | |
| `flue_outlet` | global attribute "Aansluiting" (`pa_aansluiting`) | Bovenaansluiting, Achteraansluiting, or both. |
| `power_kw` | global attribute "Vermogen" (`pa_vermogen`) | Matches existing terms such as "8kW" or "6,5 kw"; otherwise adds e.g. "7,5 kW". |
| dimensions, `weight_kg`, `flue_diameter_mm`, `flue_center_height_cm`, yes/no fields, min/max power, efficiency, energy label, warranty, material | product attributes | Labels as in the app's Marktplaats ad details (`lib/stove-specs.ts`), e.g. "Harthoogte achter: 94 cm". Unknown values are left out. WooCommerce's own `dimensions` and `weight` are not used, because their units depend on shop settings. |
| photos | `images` | Sent as short-lived signed URLs that WordPress downloads once. Each image is named `kachel-<number>-foto-<photo id>`, so later syncs reuse it instead of uploading it again. |
| `stock_quantity` | `manage_stock: true`, `stock_quantity` | |
| `made_to_order` | `manage_stock: false`, `stock_status: "onbackorder"` | Always orderable. |

## State rules

| App state | WooCommerce |
| --- | --- |
| "Webshop" ticked | Product published with the app's stock. |
| "Webshop" unticked | Product set to draft (never deleted, so order history stays intact). |
| Sold out | The database unticks "Webshop", so the product becomes a draft with stock 0. |

## Known limitations

- Two syncs for the same stove can overlap (for example two quick edits); the last one to finish
  wins, which may briefly be the older data until the next change.
- Background syncs finish after the page has refreshed; a failure shows up on the next page load.

## Phase 2: orders back to the app (not built)

A web shop order should lower the stock by the ordered quantity (through `adjust_stove_stock` or a
similar function), not set `sold_at` directly. Needs an order webhook with signature verification,
a narrowly scoped server-side database function, and a Vercel Deployment Protection exception for
the webhook route only.
