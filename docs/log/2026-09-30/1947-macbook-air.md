# 2026-09-30 19:47 – macbook-air

Branch: `main`

## Done
- Explored how to make the app reachable from the woonwarmer.nl WordPress site. No code changes.
- Added `voorraad.woonwarmer.nl` as a domain to the Vercel project.
- Added `https://voorraad.woonwarmer.nl` to the Supabase Auth URL configuration.

## Decisions
- Use the subdomain `voorraad.woonwarmer.nl` instead of embedding the app in a WordPress iframe:
  auth cookies in an iframe are third-party cookies and are blocked by Safari (and increasingly Chrome).
- No reverse proxy on `woonwarmer.nl/voorraad`; too much effort for little gain.
- A WordPress menu item or redirect to the subdomain is optional and not planned for now.

## Open items
- The woonwarmer.nl domain owner still has to add the DNS record. DNS is at Hostinger (hPanel),
  nameservers `ns1/ns2.dns-parking.com`; add a `CNAME` for `voorraad` with the value Vercel shows under
  Settings → Domains. Not present yet at 19:47.
- After the DNS change: check that Vercel shows the domain as "Valid" (SSL) and that login works on
  the subdomain.

## Manual steps and migrations
- No migrations.
- Vercel domain and Supabase URL configuration changed (see Done).
