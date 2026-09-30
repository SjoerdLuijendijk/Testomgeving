# 2026-09-30 17:45 – macbook-air

Branch: `feature/print-stock`

## Done
- Confirmed the WooCommerce webhook is dropped (removed in `b74720c` by another session); the webhook
  setup open item of the 15:55 log no longer applies.
- Stock page has a "Afdrukken" button that prints all stoves in stock (not sold, not made to order),
  "Nieuw" and "Gereviseerd" as separate lists with totals, on A4 landscape.
- Released to staging and production.

## Decisions
- Made-to-order stoves are left off the printout; the printout ignores the on-screen search and tabs.

## Open items
- Test printing on production, also in Safari (it may ignore the landscape setting; then choose
  landscape in the print dialog).
