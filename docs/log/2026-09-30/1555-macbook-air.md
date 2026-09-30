# 2026-09-30 15:55 – macbook-air

Branch: `feature/session-log`

## Done
- Brought local `main` and `staging` up to date with GitHub (`cf8dbb5`: WooCommerce sync, shop import,
  2dehands checkbox, deleting stoves). Production runs `cf8dbb5`.
- Removed `.env.local` from this computer.
- Added this session log (`docs/log/`), a `CLAUDE.md` that loads `AGENTS.md`, and the Session Log
  rules in `AGENTS.md`.

## Decisions
- No environment variables on local computers: they live only in Vercel. Changes are tested through
  Vercel Preview deployments; the app is not run locally with `npm run dev`.
- One log file per session, committed on the working branch and pushed so other computers can read it.

## Manual steps and migrations
- The six migrations of 2026-09-30 (`20260930120000` to `20260930211000`) and the new WooCommerce and
  OpenAI variables in Vercel are, according to the user, in place.
