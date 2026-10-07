# Readers' Choice

Mobile-first book club app: clubs, meetings, book nominations and voting (approval + ranked-choice), themes, personal and club-wide year rankings. Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4 + shadcn/ui, Supabase Postgres, NextAuth v5 (Google + email/password), deployed on Vercel.

## Commands

- `npm run test:run` (offline unit tests), `npm run lint`, `npx tsc --noEmit`. Run these and the build before committing.
- `npm run build` needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; locally, dummy values work (as in CI): `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co SUPABASE_SERVICE_ROLE_KEY=dummy npm run build`.
- `npm run test:integration` hits the live Open Library API; it's excluded from the default run.

## Local testing (verify changes in a real browser)

A local Supabase stack (Docker) mirrors production's schema; `supabase/seed.sql` fills it with test data. Nothing here touches production.

- `npm run dev:local` starts the stack if needed and serves the app on http://localhost:3000 against it. Plain `npm run dev` uses `.env.local` instead.
- `npm run db:reset` re-runs every migration plus the seed. Do it before verifying anything that depends on seeded state.
- Log in with email/password (Google doesn't work locally). Users and meeting IDs are listed at the top of `supabase/seed.sql` and in `e2e/seed.ts`: `alice@example.test` (admin), `bob@example.test`, `carol@example.test`, and `dave@example.test` (in a different club). Password: `password123`.
- The seed has one meeting in each phase: finalized, voting closed, voting open, nominating. Dates are relative to the time of the reset.
- To verify a change, drive the UI with Playwright (accessibility snapshots, not screenshots), then check the data with `npm run db:sql -- -c "select ..."`. The Supabase MCP tools point at **production**, so use `db:sql` for local data.
- `npm run test:e2e` runs the Playwright smoke specs in `e2e/` (mobile viewport). They only read seed data. Add a spec when a flow is worth guarding.
- Studio, a browser UI for the local data, is at http://127.0.0.1:54323.

## Security model

- All database access is server-side with the service-role key, which bypasses RLS. NextAuth never sets `auth.uid()`; the `anon`/`authenticated` roles have no grants and there are no RLS policies.
- So authorization lives in server actions: every exported `"use server"` function is a public endpoint and must check the session and the caller's club membership/admin role itself (`authenticatedAction` in `lib/safe-action.ts`).
- Multi-row writes (votes, rankings, admin changes) go through Postgres functions called with `supabase.rpc` so they're atomic.
- Book descriptions are rendered as HTML only through `sanitizeDescription` (`lib/sanitize-description.ts`).

## Database migrations

- There is one deployed environment: production. Deploying code does not run migrations.
- Test a migration locally first: add it under `supabase/migrations/`, run `npm run db:reset`, and update `supabase/seed.sql` if the new schema needs seed data.
- Then apply it to production with the Supabase MCP `apply_migration` tool and rename the file `supabase/migrations/<version>_<name>.sql` using the version it recorded (`list_migrations`).
- A migration goes live before the code that uses it deploys, so it must work with the currently deployed code.
- For schema questions, read the migrations or query the live database (`list_tables`, read-only `execute_sql`).

## UI

- Server Components by default; `"use client"` only when needed. No `any`.
- Read `DESIGN_GUIDE.md` before UI work: palette tokens (rust/gold/cream/dark), `font-voga` headings, `font-inria` body. Show errors with `components/ui/alert.tsx`.

## Deploys

Merging to `main` deploys to production (https://readers-choice.vercel.app). Vercel preview URLs are behind SSO.
