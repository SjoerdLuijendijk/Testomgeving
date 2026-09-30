# Session log

Shared logbook for work on this project from several computers. Every working session adds one
file, so sessions on different computers never edit the same file and do not cause merge conflicts.

## Location

`docs/log/<YYYY-MM-DD>/<HHMM>-<machine>.md`

- Date and start time in local time.
- `<machine>` is a short, non-personal label for the computer, for example `macbook-air` or `office-pc`.

## Template

```markdown
# <YYYY-MM-DD> <HH:MM> – <machine>

Branch: `<branch>`

## Done
- ...

## Decisions
- ...

## Open items
- ...

## Manual steps and migrations
- Migrations added, and whether they have been applied to Supabase.
- Dashboard or Vercel changes made or still needed.
```

Leave out sections that are empty. Never include secrets, credentials, environment values, or
personal data.

## Reading

Logs travel with the branch they were committed on and are only visible on other computers after
a push. Read recent logs from all remote branches (see the Session Log section in `AGENTS.md`).
