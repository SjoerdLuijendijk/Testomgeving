# 2026-09-30 15:55 – macbook-air

Branches: `feature/session-log`, `feature/photo-preview-count`, `feature/admin-invoices`,
`feature/shop-stove-numbers`, `feature/shop-to-app-sync`

## Done
- Brought local `main` and `staging` up to date with GitHub (`cf8dbb5`: WooCommerce sync, shop import,
  2dehands checkbox, deleting stoves).
- Removed `.env.local` from this computer.
- Added this session log (`docs/log/`), a `CLAUDE.md` that loads `AGENTS.md`, and the Session Log
  rules in `AGENTS.md`.
- Inventory shows only the main photo plus a "+count" tile; other photos load in the viewer, where
  they can also be deleted.
- "Instellingen" renamed to "Admin", with a new "Facturen" tab listing all invoices. Stoves with
  invoices can be deleted; invoices keep the stove number.
- New stoves continue the shop's five-digit numbering (highest ever + 1). The sync never overwrites a
  shop product found by SKU unless it carries the `woonwarmer_stove_number` marker.
- A WooCommerce webhook was built and released, then removed again at the user's request.
- Admin → Webshop → "Alles uit webshop ophalen": updates existing stoves (stock, price, attributes,
  online status) and imports new shop products, never twice.
- Removed the Marktplaats and 2dehands checkboxes (linked from WooCommerce itself).
- Web shop name is now brand + stove type ("Hwam Houtkachel"); the "Naam in webshop" and "Model"
  fields are gone (migration `20260930240000_optional_stove_model.sql` makes the column optional).
- Released all of the above to staging and production.

## Decisions
- No environment variables on local computers: they live only in Vercel. Changes are tested through
  Vercel Preview deployments; the app is not run locally with `npm run dev`.
- One log file per session, committed on the working branch and pushed so other computers can read it.
- Existing six-digit stove numbers stay as they are.
- No automatic sync from the shop to the app; shop data is fetched by hand with one button.
- The AI ad text button ("Advertentie") stays for now.

## Open items
- Clean up after dropping the webhook: delete the Supabase secret key `woocommerce_webhook`
  (Oefenomgeving → Project Settings → API Keys) and the Vercel variables `SUPABASE_SECRET_KEY` and
  `WOOCOMMERCE_WEBHOOK_SECRET`, plus any WordPress webhooks pointing to bouwstream.nl.
- Test on production: photo tile, Admin → Facturen, deleting a stove with an invoice, adding a stove
  (number 26xxx), and "Alles uit webshop ophalen".

## Manual steps and migrations
- `20260930240000_optional_stove_model.sql` must be applied before the release of
  `feature/remove-model` (new stoves are saved without a model).
- The six migrations of 2026-09-30 (`20260930120000` to `20260930211000`) and the WooCommerce and
  OpenAI variables in Vercel are, according to the user, in place.
- Applied and verified after the production release: `20260930230000_keep_invoices_of_deleted_stoves.sql`
  and `20260930233000_continue_shop_stove_numbers.sql` (counter at 26121, next stove 26122).
