# 2026-10-01 10:30 – windows-pc

Branch: `feature/quotes`

## Done
- Removed `.env.local` from this Windows computer (per the 2026-09-30 decision); pull it again with
  `vercel env pull .env.local --environment=development` to run the app locally.
- Articles (Instellingen → Artikelen): checkboxes per row and per category select articles, which
  are deleted together from a selection bar after confirmation (max 500 per delete). Existing quotes
  keep their lines.
- Released to staging and production.

## Open items
- Not tested in the browser: the article selection and bulk delete (check on desktop and mobile).
- Open items from `0700-windows-pc.md` still stand (production tests, viewing migration check).
