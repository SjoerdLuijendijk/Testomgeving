# 2026-10-01 07:00 – windows-pc

Branches: `feature/stove-notes`, `feature/quotes`

## Done
- Brought this computer up to date with GitHub (`bf0314f`). Stale uncommitted changes from an older
  copy of the admin/invoices work were stashed (`git stash`), not deleted.
- The user confirmed: the webhook clean-up (Supabase key, Vercel variables, WordPress webhooks) and
  the production tests from the 2026-09-30 logs are done.
- Sales notes ("Notities"): "Te koop" and "−1 verkocht" open a note dialog with status "Verkocht";
  a speech-bubble icon adds a note "In onderhandeling". Fields: buyer, pickup or delivery with date
  and time, sale price, payment (status, method, deposit amount) and agreements; only the status is
  required, and selling without details only lowers the stock. Open notes show as labels on the
  stove; the account menu has "Notities" with a count of open notes and a list (Open / Afgehandeld /
  Alles).
- The status pill opens a list of statuses to choose from; the dialog only holds the details.
- Selling asks "Direct afgeleverd" or "Nog af te leveren"; the latter shows in the new "Af te
  leveren" list (account menu) with the agreements per stove until it is marked "Afgeleverd".
- "Af te leveren" is a table in the stock table layout with totals paid and still to pay; the notes
  list leaves those stoves out. The note dialog closes on a click outside it while unchanged.
- "Agenda" in the account menu: pickups and deliveries per day. Times are chosen per quarter of an
  hour. A "Bezichtiging" kind was tried and removed again at the user's request.
- New stoves: stock in its own "Voorraad" column (− / +); no status label but a green "Verkoop
  plaatsen" button (dialog: "1 verkocht" or "In onderhandeling"); their notes only appear in the
  lists, not in the row. Taking the last unit asks: in archief plaatsen or op bestelling leverbaar.
- Menu: Agenda, Af te leveren, In onderhandeling (was Notities), Verkocht archief, Facturen and
  Instellingen (Bedrijfsgegevens, Prompt instellen, Webshop). The stock page is called "Aanbod".
- Facturen and all note lists use the stock table layout; rows in the note lists open the note.
- Form fixes: selects and textareas inherit the page font; note dialog fields match in size.
- Separate invoices without a stove ("+ Losse factuur" on Facturen).
- Quotes (menu → Offertes, numbering O2026-0001): lines from stoves, articles or typed (optionally
  saved as article), status Concept/Verstuurd/Geaccepteerd/Afgewezen, an accepted quote opens a
  concept invoice. Articles (Instellingen → Artikelen) with CSV import keyed on SKU. Logo on PDFs.
- Articles grouped per category, article numbers hidden (still the CSV import key); quote lines are
  picked from scrollable lists, picking again raises the quantity; preview shows lines without price.
- Market prices researched for all 231 articles (Dutch web shops, other diameters derived by a
  factor) and written to a new CSV on the user's desktop for import; roof outlets got unique SKUs.
- "＋ Montage" in quotes and invoices at the hourly rate (excl. VAT) under Bedrijfsgegevens.
- Released to staging and production.

## Decisions
- No "Gereserveerd" status: negotiating keeps the stove for sale and in the web shop.
- Statuses: negotiating -> sold | cancelled, sold -> done | cancelled; enforced by a database trigger,
  which also takes one unit from the stock when a note becomes sold.
- Closed notes are deleted one year after closing (personal data); this runs when the notes list
  is opened.
- The menu item is called "Notities".

## Open items
- Test on production: selling a used stove (delivered now / to deliver), Verkoop plaatsen on a new
  stove, the last-unit choice, cancelling a sale with restock, Agenda, Af te leveren, In
  onderhandeling, Facturen, and the web shop stock after a sale.
- Unknown whether the removed viewing migration was applied; if so, restore the handover check to
  ('pickup', 'delivery').
- Then release to production.
- Possible follow-up: prefill the invoice dialog with the buyer from a sold note.
- This Windows computer still has a `.env.local`; per the 2026-09-30 decision it may be removed.

- Supplier CSV (kachelwinkel_artikelen.csv): 12 roof outlets for tiled roofs share a SKU per
  diameter (DD-130-PANNENDAK etc.) and are skipped on import until they get their own SKU; the file
  has no prices yet.
- Not yet tested in the browser: quotes, articles, CSV import, invoice from a quote.

## Manual steps and migrations
- `20261001120000_create_stove_notes.sql`: applied by the user.
- `20261001170000_allow_invoices_without_stove.sql` and `20261001190000_create_articles_and_quotes.sql`:
  applied by the user. `20261001210000_add_hourly_rate.sql`: applied by the user.
- The viewing migration was removed from the repository again; if it was applied, its constraint
  change has to be undone (see the chat of this session).
