# Woonwarmer stove inventory

Web app for registering stoves: take photos, enter the brand and details, and the app assigns the next
stove number in the web shop's five-digit numbering (26119, 26120, ...; migration
`20260930233000_continue_shop_stove_numbers.sql`). Stoves registered before that keep their six-digit
number (100001, ...). The inventory screen lists all stoves with photos, a search bar
and a one-click "sold" status.

Built with Next.js (App Router) and Supabase (Auth, Postgres, Storage).

## Local development

1. `npm install`
2. Link the existing Vercel project (`vercel link`) and pull the Development variables:
   `vercel env pull .env.local --environment=development`. The required names are in `.env.example`.
3. `npm run dev` and open http://localhost:3000

## Environments

Production runs on https://bouwstream.nl (branch `main`), staging on https://staging.bouwstream.nl
(branch `staging`). See `docs/environments.md` for the branch workflow and the shared database.
Work sessions from all computers are recorded in `docs/log/` (see `docs/log/README.md`).

## Supabase setup

1. Apply the migrations in `supabase/migrations` to the project.
2. Auth → Providers → Email: keep e-mail/password enabled, disable "Allow new users to sign up"
   and set a minimum password length of at least 12 characters.

## Access control

Users sign in with e-mail and password. There is no self sign-up and no password reset in the
app yet. Adding a team member takes two steps:

1. Auth → Users → "Add user" → "Create new user" with their e-mail address and a password,
   with "Auto Confirm User" enabled.
2. In the SQL editor: `insert into public.team_members (email) values ('name@example.com');`
   (lowercase e-mail).

Row Level Security on `stoves`, `stove_photos` and the private `stove-photos` storage bucket
allows access only to signed-in users whose e-mail is in `team_members`. After creation the stove
number stays fixed; team members can edit the other details. Photos are served through
short-lived signed URLs.

## Product details

Besides the required details (brand, condition, dimensions, flue outlet and diameter, price)
a stove has optional product details that the web shop shows: stove type, power
(kW), weight, rear flue centre height, external air supply, new firebox, thermostat, and under
"Meer productgegevens" minimum/maximum power, efficiency, energy label, warranty, material and a
description. The flue outlet can be top, rear or both.
"Type kachel" is free text with suggestions (Houtkachel, Speksteenkachel, ...); a known type is
stored as a key, anything else as typed. The web shop name is always the brand plus the stove type
("Hwam Houtkachel"), or only the brand
when no type is chosen. The model is no longer entered (migration `20260930240000_optional_stove_model.sql`).

## Stock

The inventory has three tabs: used, new and made to order ("Op bestelling"). A used stove is a
single unit with a "sold" toggle. A new stove model from stock has one stove number with a stock
quantity (set when adding it) and "−1 verkocht" / "+1" buttons. A made-to-order stove is a new
model sold without stock and ordered from the supplier once sold: it keeps no stock and never
sells out. The database keeps `sold_at` and `stock_quantity` consistent: a stove
is sold exactly when its stock is 0. Stock changes go through `adjust_stove_stock()`, one unit at a
time, so concurrent sales cannot overwrite each other.

## Sales notes

A note records a negotiation or sale of a stove: buyer, pickup or delivery with date and time, sale
price, payment (open, deposit or paid; cash, pin or bank) and further agreements. Only the status is
required. "Te koop" and "−1 verkocht" open the note dialog with status "Verkocht"; the speech-bubble
icon adds a note "In onderhandeling", while the stove stays for sale. Selling without filling in
anything only lowers the stock. A used stove in negotiation shows "In onderhandeling" on its
status pill instead of "Te koop"; other open notes show as labels on the stove; the account menu has
"Notities" with all notes and the number of open ones.

The status flows from "In onderhandeling" to "Verkocht" or "Geannuleerd", and from "Verkocht" to
"Afgehandeld" or "Geannuleerd". The `stove_notes` trigger enforces this and takes one unit from the
stock when a note becomes sold, in the same statement. Cancelling a sale asks whether the stove is
back in stock. Done and cancelled notes contain personal data and are deleted one year after closing
when the notes list is opened (migration `20261001120000_create_stove_notes.sql`).

## Web shop

Each stove has a "Webshop" checkbox (`shop_listed`) for the WooCommerce web shop, off by default.
When a stove sells out the database unticks it, and it cannot be ticked while it is sold out.
Changes to a stove are pushed to the WooCommerce shop in the background. Shop changes (stock,
price, attributes, new products) are fetched on request with Admin → Webshop → "Alles uit webshop
ophalen"; nothing comes back automatically. Configuration and field mapping: `docs/woocommerce-sync.md`.

Marktplaats and 2dehands are linked from WooCommerce itself and are not part of the app. The
former columns `marketplace_listed` and `secondhand_listed` are no longer used.

## Deleting stoves

The bin icon in the inventory deletes a stove with its photos. Its invoices are kept: they only
record the stove number (migration `20260930230000_keep_invoices_of_deleted_stoves.sql`). The
dialog offers to move its web shop product to the WordPress trash as well; if that fails, nothing is
deleted.

## Invoices

Each stove has a "Factuur" button that opens a dialog for customer details and invoice lines
(unit prices incl. VAT, 21 %, 9 % or 0 % per line) with a live draft PDF preview. "Factuur maken"
calls the `create_invoice()` database function, which stores the invoice and its lines in one
transaction and assigns the next number of the year (2026-0001, 2026-0002, ...). The seller
details from Admin → Bedrijfsgegevens are copied onto the invoice.

Invoices cannot be changed or deleted after creation; corrections need a credit invoice. PDFs are
generated in the browser with `pdf-lib` and can be downloaded again from the inventory or from
Admin → Facturen, which lists all invoices, including those of deleted stoves.

## Marktplaats ad text

When a stove is added or edited, the Server Action schedules an OpenAI call with Next.js `after()`
(Responses API via `fetch`) and stores the resulting Dutch Marktplaats ad in `stoves.marketplace_ad`,
so saving never waits for it. On desktop the "Advertentie" button (hidden on phones) shows the stored
text; if it is missing (older stoves, or a failed background call) it is generated on demand.
"Opnieuw" generates and stores a new version. The text can be edited and saved by hand
(`marketplace_ad_edited`); a manual text is never overwritten automatically. If the stove is edited
afterwards, `marketplace_ad_outdated` is set and the dialog asks to check the text.

There is no automatic sync with Marktplaats or 2dehands: posting and updating through their API
requires a Marktplaats Pro (business) account and a certified API partner. Ads are copied from the
app and updated by hand on both sites.

The prompt is editable under Admin → Advertentie (`ad_settings`, team members only); the
built-in default in `lib/ad-prompt.ts` is used until it is saved. Fixed guard rules (use only the
given facts, plain text) are always appended in `lib/marketplace-ad.ts`. Changing the prompt or the
company details does not regenerate existing ads.

Only stove facts and the company details are sent to OpenAI, never customer data; requests use
`store: false`. Requires `OPENAI_API_KEY` (server-only, in Vercel). `OPENAI_MODEL` is optional and
overrides the default model. Generated text can contain mistakes; check it before posting.

## Photos

Photos are resized in the browser to JPEG (max. 1600 px) before upload. The server accepts
JPEG only, max. 1.5 MB per photo and 4 MB per upload (Server Action / Vercel request limit).
