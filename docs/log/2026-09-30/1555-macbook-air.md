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
- WooCommerce webhook (`/api/woocommerce/webhook`) takes shop changes, orders and new products back
  into the app.
- Released all of the above to staging and production.

## Decisions
- No environment variables on local computers: they live only in Vercel. Changes are tested through
  Vercel Preview deployments; the app is not run locally with `npm run dev`.
- One log file per session, committed on the working branch and pushed so other computers can read it.
- Existing six-digit stove numbers stay as they are.
- Shop changes win when they are newer than the app's last push; new shop products are imported
  automatically (unlinked).

## Open items
- Test on production: photo tile, Admin → Facturen, deleting a stove with an invoice, adding a stove
  (number 26xxx), and a WordPress edit arriving in the app.

## Manual steps and migrations
- The six migrations of 2026-09-30 (`20260930120000` to `20260930211000`) and the WooCommerce and
  OpenAI variables in Vercel are, according to the user, in place.
- To apply after the production release, in this order: `20260930230000_keep_invoices_of_deleted_stoves.sql`,
  `20260930233000_continue_shop_stove_numbers.sql`.
- Webhook setup (docs/woocommerce-sync.md → Setup): `SUPABASE_SECRET_KEY` and
  `WOOCOMMERCE_WEBHOOK_SECRET` in Vercel Production, then four webhooks in WordPress.
