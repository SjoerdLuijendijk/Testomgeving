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
2. Auth → URL Configuration: add `http://localhost:3000/auth/confirm` and the production
   `https://<domain>/auth/confirm` to the redirect URLs, and set the Site URL.
3. Recommended: disable public sign-ups (Auth → Providers → Email). The login form never
   creates accounts itself.
4. Optional: to let a magic link work when it is opened in a different browser than the one
   that requested it, change the "Magic Link" email template link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.

## Access control

Only team members can use the app. Adding a team member takes two steps:

1. Auth → Users → "Invite user" with their e-mail address.
2. In the SQL editor: `insert into public.team_members (email) values ('name@example.com');`
   (lowercase e-mail).

Row Level Security on `stoves`, `stove_photos` and the private `stove-photos` storage bucket
allows access only to signed-in users whose e-mail is in `team_members`. After creation only
`sold_at` of a stove can be changed. Photos are served through short-lived signed URLs.

## Photos

Photos are resized in the browser to JPEG (max. 1600 px) before upload. The server accepts
JPEG only, max. 1.5 MB per photo and 4 MB per upload (Server Action / Vercel request limit).
