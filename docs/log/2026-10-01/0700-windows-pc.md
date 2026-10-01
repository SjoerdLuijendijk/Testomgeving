# 2026-10-01 07:00 – windows-pc

Branch: `feature/stove-notes`

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
- Released to staging.

## Decisions
- No "Gereserveerd" status: negotiating keeps the stove for sale and in the web shop.
- Statuses: negotiating -> sold | cancelled, sold -> done | cancelled; enforced by a database trigger,
  which also takes one unit from the stock when a note becomes sold.
- Closed notes are deleted one year after closing (personal data); this runs when the notes list
  is opened.
- The menu item is called "Notities".

## Open items
- Test on staging: the status list, selling delivered now / to deliver, a negotiation, the last unit
  of a new stove (archive / made to order), cancelling a sale with restock, Af te leveren, Notities.
- Then release to production.
- Possible follow-up: prefill the invoice dialog with the buyer from a sold note.
- This Windows computer still has a `.env.local`; per the 2026-09-30 decision it may be removed.

## Manual steps and migrations
- `20261001120000_create_stove_notes.sql`: applied by the user.
- The viewing migration was removed from the repository again; if it was applied, its constraint
  change has to be undone (see the chat of this session).
