# Readers' Choice

Mobile-first book club app (clubs, meetings, nominations, approval + ranked-choice voting, themes, year rankings). Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4 + shadcn/ui, Supabase Postgres, NextAuth v5, Vercel.

## Ownership

You own this codebase. There is no other team: you wrote most of it, you will maintain it, and you will build on whatever you leave behind. Don't treat existing code as someone else's to work around. If it's in the way, change it.

- When the clean solution needs a refactor (renaming, moving code, changing an interface, deleting dead code), do it as part of the work. Don't leave workarounds or TODOs for someone else.
- Check in first only when a refactor is large or changes product behavior, data, or production. This replaces the global "stop and wait for a decision on any refactor" rule for this repo.

## Commands

- Before committing: `npm run lint && npx tsc --noEmit && npm run test:run`, and the build with dummy env: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co SUPABASE_SERVICE_ROLE_KEY=dummy npm run build`.
- Local app and database: the `verify-locally` skill. Schema changes: the `database-migrations` skill.

## Verifying work

- Every PR carries `verifications/<pr-number>.md`: what you checked, how, what you saw, and what you didn't check. Read `verifications/README.md` before verifying. The Verification check fails on a ready PR without a complete file.
- Write down only what you observed. A gap you admit is useful; a check you claim but didn't run is not.
- A PR is ready for review only when it's marked ready and CI is green. Don't tell the user it's ready before then.

## Architecture

`app/` (pages, `"use server"` actions) → `server/` (all data access, `server-only`) → `lib/` (pure logic). ESLint enforces the direction. Pages read through `getViewer()` and `server/` queries. Actions only validate, authorize, call `server/`, and revalidate. Each one wraps its body in `runAction` and returns `ActionResult<T>`. Throw `UserError` for messages users should see. Details and an "adding a feature" walkthrough: `docs/architecture.md`.

## Don't break production

- Every exported `"use server"` function is a public endpoint, and the service-role key bypasses RLS. Authorize every action with `requireMember`/`requireAdmin` (`server/authz.ts`).
- The Supabase MCP tools point at **production**. Use `npm run db:sql` for local data, and apply migrations only when asked.
- Migrations go live before the code that uses them, so they must work with the deployed code.
- Merging to `main` deploys to production. CI and staging previews: `docs/ci-and-previews.md`.
- Render book descriptions as HTML only via `sanitizeDescription`. OverDrive/Libby lookups (`lib/libraries/overdrive.ts`) use undocumented endpoints: fail soft and never send patron data.

## UI

Mobile-first. Server Components by default. Read `DESIGN_GUIDE.md` before UI work. Layouts render the app shell (top bar and tabs), so pages render only their content, starting with `PageHeader`. Show errors with `components/ui/alert.tsx`.
