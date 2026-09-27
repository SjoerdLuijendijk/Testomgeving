# Project Instructions

## Communication

- Communicate with the user in the language the user uses.
- For this user, explanations and status updates will normally be in Dutch.
- Keep technical explanations clear, practical, and concise.
- Code, code comments, documentation, filenames where appropriate, Git branch names, commit messages, and pull request descriptions must be in English.
- At the start of a new working session, briefly confirm in Dutch that these project instructions have been read and will be followed.
- Do not repeat the complete instruction file unless explicitly asked.

## Session Start

At the beginning of every new working session, or after a substantial pause:

1. Read this AGENTS.md completely.
2. Read any relevant project documentation, including README.md and other instruction files.
3. Inspect the repository structure when necessary.
4. Run `git status`.
5. Identify uncommitted changes before editing anything.
6. Do not overwrite, discard, or revert existing work unless explicitly instructed.
7. Report unexpected files, uncommitted changes, failed checks, unclear repository state, or possible conflicts before making risky changes.
8. Briefly confirm in Dutch that the instructions have been read and that you understand the current repository state.

Do not perform broad repository exploration when the necessary context is already known. Gather only the information required for the task.

## General Development Workflow

For every development task:

1. Understand the existing implementation before changing it.
2. For non-trivial work, make a short implementation plan before editing.
3. Preserve existing architecture and conventions unless there is a clear reason to improve them.
4. Implement the smallest complete solution that satisfies the requirement.
5. Work in small, verifiable steps.
6. Avoid unrelated refactors.
7. Do not silently change existing behavior.
8. Reuse existing components, utilities, patterns, and dependencies when appropriate.
9. Do not add dependencies unless they provide clear value.
10. Verify the result before declaring the task complete.

If requirements are ambiguous and the ambiguity could materially affect architecture, security, data, or user-visible behavior, ask before making assumptions.

## Code Quality and Structure

- Prefer simple, readable, maintainable code over clever code.
- Use TypeScript correctly and avoid `any` unless there is a documented reason.
- Keep files and components focused on one responsibility.
- Separate UI, business logic, data access, configuration, and integrations where practical.
- Prefer one significant React component per file.
- Extract reusable logic instead of duplicating it.
- Avoid monolithic files and components.
- Around 300 lines, actively consider whether a file should be split.
- Files over 500 lines should be exceptional and justified by cohesion.
- Use clear and descriptive English names.
- Remove dead code created by your own changes.
- Do not leave debugging code, temporary logging, commented-out implementations, or unused imports behind.
- Follow the project's existing formatting and linting conventions.

## Next.js / React

This project uses Next.js, React, and TypeScript.

- Follow the existing App Router architecture.
- Prefer Server Components by default when appropriate.
- Use Client Components only where client-side behavior is actually required.
- Keep server-only logic out of client bundles.
- Do not expose secrets or privileged operations to the browser.
- Keep data access and privileged mutations on the server where appropriate.
- Validate untrusted input server-side.
- Keep components small and composable.
- Avoid unnecessary client-side state.
- Consider loading, empty, error, and success states for user-facing features.

## Supabase and Database

Treat database design and authorization as production-quality even when working in development or test environments.

### Migrations

- All database schema changes must be implemented through versioned migration files.
- Never rely solely on manual dashboard changes for schema changes that belong in source control.
- Keep migrations focused and understandable.
- Do not rewrite already-applied migrations unless explicitly required and safe.
- Prefer adding a new migration for subsequent changes.
- Consider backward compatibility and existing data before adding constraints or destructive changes.

### Row Level Security

Security must be correct by default.

- Enable and correctly configure Row Level Security for user-accessible tables where applicable.
- Use least privilege.
- Users may only read, create, update, or delete data they are explicitly authorized to access.
- Never create broad `anon` or `authenticated` policies merely to make a feature work.
- Never disable RLS as a workaround.
- Never use the Supabase service-role key in browser/client code.
- Never use service-role access as a workaround for incorrect RLS.
- Review authorization whenever adding or modifying a table, database function, storage bucket, or data-access path.
- Database functions must not be executable by `public`, `anon`, or `authenticated` unless that access is explicitly required.
- RLS and authorization are part of the Definition of Done.

If correct authorization requires authentication, ownership information, roles, or another security mechanism that does not yet exist, do not invent an insecure workaround. Explain what is missing and ask before proceeding when necessary.

### Supabase Storage

- Treat storage authorization with the same care as database authorization.
- Use private buckets for private user files unless public access is explicitly intended.
- Create appropriate storage policies.
- Use signed URLs or authorized server-side access for private files where appropriate.
- Organize storage paths so authorization can be enforced cleanly, for example using a user ID or other ownership identifier.
- Prevent users from reading, replacing, or deleting files belonging to other users.

## Authentication and Authorization

- Authentication and authorization are separate concerns; verify both.
- Never assume that being logged in automatically grants access to a resource.
- Enforce ownership and permissions server-side and in RLS where applicable.
- Do not rely on hidden UI elements for security.
- Validate authorization for server actions, route handlers, database access, storage operations, and other privileged operations.
- Follow least privilege by default.

## Secrets and Environment Variables

- Never commit secrets, passwords, private API keys, tokens, service-role keys, signing keys, certificates, or credentials.
- `.env` and environment-specific secret files must remain gitignored.
- Maintain `.env.example` when environment variables are required by the project.
- `.env.example` must contain placeholders only, never real secrets.
- Server-only secrets must stay server-side.
- Never expose server-only secrets through `NEXT_PUBLIC_*`.
- Production secrets belong in the appropriate secret store, such as Vercel environment variables or Supabase secrets.
- Before committing changes involving configuration, inspect the diff for accidental secrets.
- If a secret may already have been committed or exposed, stop and report it. Treat rotation as required unless it is clearly a non-secret public credential.

## External APIs and Integrations

- Keep privileged API calls server-side.
- Store credentials only in approved secret stores.
- Handle authentication and token refresh correctly.
- Validate external responses where appropriate.
- Handle errors and timeouts deliberately.
- Avoid logging sensitive payloads or credentials.
- For OAuth integrations, use secure redirect handling and state validation.
- Request only the permissions/scopes actually needed.

## Edge Functions and Server Functions

- Keep functions focused on a clear responsibility.
- Validate input.
- Authenticate callers where required.
- Authorize the requested operation, not merely the caller's identity.
- Keep secrets server-side.
- Return useful but non-sensitive errors.
- Avoid exposing internal stack traces or credentials.
- Consider retries and idempotency for operations that can be executed more than once.

## File Uploads

When implementing uploads:

- Validate file type and file size.
- Do not trust the filename or MIME type supplied by the browser without appropriate validation.
- Use safe generated storage paths.
- Enforce ownership through storage policies and application logic.
- Clean up files when their owning record is deleted when appropriate.
- Prevent unauthorized access through predictable URLs.
- Respect platform request-size limits.
- Use signed URLs or equivalent mechanisms for private files where appropriate.

## Git Workflow

- Keep `main` buildable and deployable.
- Do not commit or push unless the user explicitly asks or has explicitly authorized it for the current task.
- Before proposing a commit, review `git diff` and `git status`.
- Never include unrelated changes in a commit.
- Prefer one logical change per commit.
- Commit messages must be concise, imperative, and in English.
- Use descriptive English branch names.
- Do not force-push, rewrite shared history, reset destructive changes, or delete branches without explicit approval.
- Do not discard uncommitted user or agent work.
- When multiple agents may work on the repository, avoid editing the same files concurrently and report possible conflicts.

## Working With Other Coding Agents

This repository may also be edited by Claude Code or another coding agent.

- Assume another agent may have created uncommitted changes.
- Always inspect Git status before starting.
- Never overwrite or revert another agent's work without explicit approval.
- Keep your changes scoped to the assigned task.
- If another agent appears to be editing the same area, stop and report the conflict.
- Prefer separate Git branches or worktrees when agents work simultaneously.
- Treat committed repository documentation as the shared source of truth for project standards.
- Do not assume instructions specific to another agent override this AGENTS.md unless the user explicitly says so.

## Testing and Verification

Before declaring development work complete, run the relevant checks available in the project.

Where applicable, this includes:

- TypeScript/type checking
- linting
- automated tests
- production build
- database/migration verification
- security and authorization review
- manual functional verification for the changed workflow

Do not repeatedly run expensive checks without a reason. Run focused checks during implementation and the appropriate final checks before completion.

Never claim something was tested if it was not.

If a check cannot be run, clearly state that.

## Security Review

For changes involving authentication, authorization, database access, storage, uploads, server actions, API routes, external APIs, or secrets, explicitly review:

- authentication
- authorization
- RLS
- storage policies
- ownership
- input validation
- secret exposure
- client/server boundaries
- destructive operations
- unintended public access

Security is part of implementation, not an optional later step.

## Documentation

Keep project documentation aligned with meaningful implementation changes.

Update README.md or other appropriate documentation when a change affects:

- installation
- environment variables
- local development
- architecture
- deployment
- external services
- migrations
- authentication
- important operational procedures

Do not add unnecessary documentation for trivial implementation details.

## Efficiency

Work efficiently without sacrificing correctness.

- Do not repeatedly inspect the same files when they have not changed.
- Do not repeatedly run full builds when a smaller verification step is sufficient during implementation.
- Do not perform broad repository searches without a concrete reason.
- Use existing context when reliable.
- Batch related inspections when practical.
- Prefer targeted verification during implementation and a final appropriate verification at completion.
- Do not sacrifice security, correctness, maintainability, or necessary testing merely to reduce token or compute usage.

## Definition of Done

A task is not complete merely because code was written.

Before reporting completion:

1. Review the changes.
2. Check `git diff`.
3. Check `git status`.
4. Run relevant type checking, linting, tests, and/or build.
5. Verify the requested functionality as far as reasonably possible.
6. Review security and authorization where relevant.
7. Verify no secrets were introduced.
8. Confirm required database changes are represented by migrations.
9. Update relevant documentation where needed.
10. Identify anything that was not tested or could not be verified.
11. Report remaining risks, limitations, or follow-up work.

Then provide a concise Dutch completion report containing:
- what was changed;
- what was verified/tested;
- what was not verified, if anything;
- any relevant security or migration notes;
- any remaining risks or follow-up work.

If a Git commit is appropriate, propose a concise English commit message.

Do not commit or push until explicitly authorized.

## Current Project Security Context

Before performing new feature work in this repository, inspect the current Supabase/authentication state carefully.

The project previously had broad anonymous access policies for notes, note attachments, and storage. These are not acceptable under the rules above.

The intended direction is:

- Supabase Auth using email magic-link authentication.
- Notes and note files must have an owner (`user_id`).
- Existing disposable test data may be deleted rather than migrated to a user.
- Owner-only RLS for notes and note files.
- Owner-only storage access.
- Remove broad anonymous policies.
- Revoke unnecessary execution permissions on database functions such as `rls_auto_enable()`.
- Private attachments should use authorized access / signed URLs.
- Do not introduce an insecure temporary workaround.

Do not assume this security work has already been completed. Inspect the actual repository and Supabase state before relying on it.

## Current Task Boundary

For the task of creating this AGENTS.md:

- Do not implement the authentication changes yet.
- Do not alter Supabase.
- Do not alter application behavior.
- Only establish the permanent Codex instructions and inspect/report the current repository state.
