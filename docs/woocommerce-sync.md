# WooCommerce sync

Status: the app pushes stoves to the WooCommerce shop (woonwarmer.nl), and a webhook takes changes
made in the shop (title, price, stock, attributes, status, orders and new products) back into the app.

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

Every sync replaces the product's name, price, description, categories, attributes, images and
stock with the app's data. Edits made in WordPress reach the app first through the webhook (see
below), so they are only lost when the app is changed at the same moment.

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

## Shop changes back to the app (webhook)

`app/api/woocommerce/webhook/route.ts` receives WooCommerce webhooks at
`https://bouwstream.nl/api/woocommerce/webhook`. The proxy lets this one route through without a
login; every delivery must carry a valid `X-WC-Webhook-Signature` (HMAC-SHA256 of the body with
`WOOCOMMERCE_WEBHOOK_SECRET`), otherwise it is rejected with 401. The route answers at once and does
the work afterwards with `after()`.

For each product in the delivery (`lib/woocommerce/shop-to-app.ts`) the product is fetched from the
shop again, and:

| Shop event | App |
| --- | --- |
| Product changed (title, price, stock, attributes, description, status) | The linked stove is updated. Values the shop leaves empty or that cannot be read keep the app's value; the model is not taken from the title. Published → "Webshop" ticked; draft, private or trash → unticked. |
| Order created or changed | Only the stock of the ordered products is taken over, so a web shop sale counts down in the app (the database marks the stove sold at 0). |
| New product published | Imported as a stove like "Deze kachel importeren", unlinked, with its five-digit SKU as number. Fire bowls, other SKUs and sold-out products are skipped. |
| Product deleted permanently or trashed | "Webshop" unticked; the stove stays. |

A product belongs to a stove through `shop_product_id`, or through the `woonwarmer_stove_number`
marker (see Matching). Parsing reuses the import's `shopProductDetails()`; the mapping itself is in
`lib/woocommerce/shop-changes.ts`.

Echoes: every push by the app also triggers a "product updated" delivery. A product whose
`date_modified_gmt` is not later than the stove's `shop_synced_at` is the app's own push and is
skipped. Changes the webhook makes are not pushed back to the shop.

Database access: there is no signed-in user, so the route uses the Supabase secret key
(`SUPABASE_SECRET_KEY`, server-only, `lib/supabase/admin.ts`), which bypasses RLS. It is only used
after the signature check and only writes the columns above plus the import of new products.

### Setup

1. Vercel → Settings → Environment Variables, Production only (staging shares the database, so one
   receiver is enough): `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys → Secret keys;
   create one named `woocommerce-webhook`) and `WOOCOMMERCE_WEBHOOK_SECRET` (a long random value).
   Redeploy afterwards.
2. WordPress → WooCommerce → Settings → Advanced → Webhooks: add four webhooks, each with status
   Active, delivery URL `https://bouwstream.nl/api/woocommerce/webhook`, the same secret as
   `WOOCOMMERCE_WEBHOOK_SECRET` and API version WP REST API Integration v3. Topics: Product created,
   Product updated, Product deleted, Order updated.
3. Check under the webhook's logs that deliveries return 202 (or 204 for the first ping).

### Limitations

- The shop and the app changing the same stove within seconds: the last change wins.
- A WordPress change arrives when WooCommerce delivers it (usually within a minute, through its
  scheduled actions); failed deliveries are retried by WooCommerce and, after repeated failures,
  the webhook is disabled there.
- Photos changed in WordPress are not taken over.
- Removing a value in WordPress (for example deleting an attribute) does not clear it in the app.
