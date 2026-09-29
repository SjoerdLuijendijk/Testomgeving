# Woonwarmer stove inventory

Web app for registering stoves: take photos, enter brand and model, and the app assigns a
six-digit stove number (100001, 100002, ...). The inventory screen lists all stoves with photos, a search bar
and a one-click "sold" status.

Built with Next.js (App Router) and Supabase (Auth, Postgres, Storage).

## Local development

1. `npm install`
2. Link the existing Vercel project (`vercel link`) and pull the Development variables:
   `vercel env pull .env.local --environment=development`. The required names are in `.env.example`.
3. `npm run dev` and open http://localhost:3000

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

## Web shop

Each stove has an "Online" checkbox (`shop_listed`, off by default) that marks it for the
WooCommerce web shop. The sync itself is not built yet; see `docs/woocommerce-sync.md`.

## Invoices

Each stove has a "Factuur" button that opens a dialog for customer details and invoice lines
(unit prices incl. VAT, 21 %, 9 % or 0 % per line) with a live draft PDF preview. "Factuur maken"
calls the `create_invoice()` database function, which stores the invoice and its lines in one
transaction and assigns the next number of the year (2026-0001, 2026-0002, ...). The seller
details from Instellingen are copied onto the invoice.

Invoices cannot be changed or deleted after creation; corrections need a credit invoice. PDFs are
generated in the browser with `pdf-lib` and can be downloaded again from the inventory.

## Photos

Photos are resized in the browser to JPEG (max. 1600 px) before upload. The server accepts
JPEG only, max. 1.5 MB per photo and 4 MB per upload (Server Action / Vercel request limit).
