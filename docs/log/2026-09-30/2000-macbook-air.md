# 2026-09-30 20:00 – macbook-air

Branches: `feature/action-columns`, `feature/admin-gear-icon`, `feature/calmer-stock-table`,
`feature/stock-toolbar-form-style`, `feature/logo-top-left`, `feature/compact-photo-column`,
`feature/account-menu`, `feature/photo-without-count`, `feature/header-navigation`,
`feature/sold-archive-menu`, `feature/drop-condition-column`, `feature/confirm-sold`,
`feature/sell-out-choice`

## Done
- Stock table: calmer, modern look (no vertical grid lines, soft row rules, subtle headers, softer
  status pills); edit, invoice, ad and delete each in their own narrow icon column.
- No inner scroll container: the table grows with its rows and only the page scrolls.
- Toolbar: title with print button, then the type tabs, search and (former) sale filter on one line.
- "Kachel toevoegen" form restyled to match and grouped into sections (photos, stove, dimensions and
  connection, product details, price and sale). Fields, names and validation are unchanged.
- Header: full width with a larger logo top left; "Kachel toevoegen" (with + icon) and "Voorraad" as
  two navigation buttons; admin, e-mail and sign-out replaced by one account menu.
- Account menu: Verkocht archief, Facturen, Bedrijfsgegevens, Prompt instellen, Webshop, and sign-out
  separated at the bottom. The Admin page with sub tabs is gone; each page opens directly. Routes are
  unchanged (`/?tab=admin&sectie=...`); the sold archive is `/?tab=voorraad&weergave=verkocht`.
- The Te koop/Verkocht toggle is removed; Voorraad shows the current stock, sold stoves are in the
  sold archive. The condition column is dropped (the tabs already group by condition).
- Photo column: only the main photo (44 px, no count); adding and deleting photos moved to the
  edit dialog, where changes are saved straight away.
- Marking a used stove as sold asks for confirmation and says it moves to the archive. Selling the
  last unit of a new stove asks: archive, or keep it available made to order
  (`makeStoveMadeToOrder`).
- Everything above is released to staging and production (`dfd3e27`).

## Decisions
- A new stove with more than one in stock is sold one unit at a time without confirmation.
- No archive icon in the account menu, to keep the menu items consistent.

## Open items
- Marktplaats via WooCommerce (not started): put the Marktplaats ad text on the WooCommerce product in
  a field customers do not see, and only push a stove to WooCommerce once the AI ad text is ready.
  Still to decide with the user:
  - which plugin or feed sends the ads from WooCommerce to Marktplaats, which decides the meta field
    name (proposal: a hidden meta field such as `marktplaats_description`);
  - what happens when the AI cannot make the text (proposal: hold back the push, show a notice, and
    push once the text is generated or saved by hand).
  Relevant code: `refreshStoredAd` (`lib/marketplace-ad-store.ts`), `syncShopLater` in
  `app/actions.ts`, `buildShopProduct` (`lib/woocommerce/product.ts`), `pushStove`
  (`lib/woocommerce/sync.ts`), and `docs/woocommerce-sync.md`.
- Test on production: photo management in Bewerken, the account menu and sign-out, the sold archive,
  and the sell-out choice (archive / made to order, including the web shop stock status).
- Still open from earlier today: the `voorraad.woonwarmer.nl` DNS record, and cleaning up the dropped
  webhook's Supabase key and Vercel variables (see the 15:55 and 19:47 logs).

## Manual steps and migrations
- No migrations.
