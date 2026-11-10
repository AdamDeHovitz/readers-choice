# Readers' Choice

Mobile-first book club app: clubs, meetings, book nominations and voting (approval + ranked-choice), themes, personal and club-wide year rankings. Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4 + shadcn/ui, Supabase Postgres, NextAuth v5 (Google + email/password), deployed on Vercel.

## Commands

- `npm run test:run` (offline unit tests), `npm run lint`, `npx tsc --noEmit`. Run these and the build before committing.
- `npm run build` needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; locally, dummy values work (as in CI): `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co SUPABASE_SERVICE_ROLE_KEY=dummy npm run build`.
- `npm run test:integration` hits the live Open Library API; it's excluded from the default run.

## Architecture

Three layers, each importing only from the ones below it (ESLint enforces the boundaries; type-only imports may cross them):

- `app/` pages and `app/actions/` (`"use server"` endpoints). Pages load data from `server/` via `getViewer()`; they never call server actions for reads. Actions handle endpoint concerns only: wrap the body in `runAction`, validate input (`server/input.ts`), authorize (`server/authz.ts`), call a `server/` function, then `revalidatePath`. Actions never query the database directly.
- `server/` (every file imports `server-only`): one module per domain (`clubs`, `meetings`, `nominations`, `voting`, `themes`, `rankings`, `invites`, `books`, `libraries`, `users`). It holds every query and write, the DTO types the UI consumes, and the business rules that need data (finalize guard, ballot validation). The database client is `createAdminClient()`/`Db` from `server/db.ts`, typed by the generated `server/database.types.ts`.
- `lib/`: pure, isomorphic, unit-tested logic (meeting phases in `lib/meeting-schedule.ts`, voting algorithms, validation, API clients). No database or app imports.

Conventions:

- Every action returns `ActionResult<T>` (`{ success: true, data } | { success: false, error }`). Throw `UserError` (`lib/user-error.ts`) for messages the user should see. Anything else is logged and replaced with the action's generic fallback message, so database internals never reach the client. Use `throwIfDbError` for errors raised by our Postgres functions.
- UI components import DTO types from `server/` (`import type`) instead of redeclaring them.
- Query results are typed from the schema. Don't cast them; if a type looks wrong, the schema or the select string is wrong.

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
- So authorization lives in server actions: every exported `"use server"` function is a public endpoint and must check the session (`runAction` in `server/action.ts`) and the caller's club membership/admin role (`requireMember`/`requireAdmin` in `server/authz.ts`). Pages and `server/` queries check membership themselves, since they aren't behind an action.
- Multi-row writes (votes, rankings, admin changes) go through Postgres functions called with `supabase.rpc` so they're atomic.
- Book descriptions are rendered as HTML only through `sanitizeDescription` (`lib/sanitize-description.ts`).
- Library availability (`lib/libraries/overdrive.ts`) calls OverDrive/Libby's undocumented public endpoints from the server. They can change without notice, so lookups must fail soft (fall back to a catalog link) and never send patron data.

## Database migrations

- There is one deployed environment: production. Deploying code does not run migrations.
- Test a migration locally first: add it under `supabase/migrations/`, run `npm run db:reset`, then `npm run db:types` to regenerate `server/database.types.ts` (CI fails if it's stale). Update `supabase/seed.sql` if the new schema needs seed data.
- Then apply it to production with the Supabase MCP `apply_migration` tool and rename the file `supabase/migrations/<version>_<name>.sql` using the version it recorded (`list_migrations`).
- A migration goes live before the code that uses it deploys, so it must work with the currently deployed code.
- For schema questions, read the migrations or query the live database (`list_tables`, read-only `execute_sql`).

## UI

- Server Components by default; `"use client"` only when needed. No `any`.
- Read `DESIGN_GUIDE.md` before UI work: palette tokens (rust/gold/cream/dark), `font-voga` headings, `font-inria` body. Show errors with `components/ui/alert.tsx`.

## PR verification (CI)

A PR is the verification gate; CI never touches production (dummy env vars and a throwaway local Supabase stack).

- Lint, Test, Build, and E2E (this PR's code on its migrations + seed; also checks `server/database.types.ts` matches the migrations) run on every PR.
- Migration compat runs only when `supabase/migrations/` changes: it loads main's migrations and seed, applies the PR's migrations on top (production's order), then runs main's app and main's e2e specs. A failure means the migration would break the deployed code.
- Each e2e job uploads a Playwright HTML report (a screenshot per test, traces on failure; 14 days) and writes pass/fail counts plus the report link to the job summary. View it with `gh run download <run-id> -n e2e-report -D report && npx playwright show-report report`.

## Deploys

Merging to `main` deploys to production (https://readers-choice.vercel.app). Vercel preview URLs are behind SSO.

## Preview database (staging)

Vercel previews use a shared **staging** Supabase project, never production. It also hosts wedding-map and root-registry (in their own `wedding_map` and `root_registry` schemas); readers-choice owns `public` there, and the reset only touches `public`.

- Add the `preview` label to a PR to load its migrations + seed into staging (`.github/workflows/preview-db.yml`, using `supabase/staging-reset.sql`). It reloads on every push while labeled and moves the label off any other PR, so one PR owns staging at a time. Unlabeled previews see whatever schema was last loaded.
- Log in on a preview with the seed users (`alice@example.test` / `password123`); Google sign-in doesn't work on preview URLs.
- The daily keep-alive cron (`/api/keep-alive`) pings production and staging so neither free-tier project pauses.
