# Readers' Choice

Mobile-first book club app (clubs, meetings, nominations, approval + ranked-choice voting, themes, year rankings). Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4 + shadcn/ui, Supabase Postgres, NextAuth v5, Vercel.

## Commands

- Before committing: `npm run lint && npx tsc --noEmit && npm run test:run`, and the build with dummy env: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co SUPABASE_SERVICE_ROLE_KEY=dummy npm run build`.
- Local app and database: the `verify-locally` skill. Schema changes: the `database-migrations` skill.

## Architecture

`app/` (pages, `"use server"` actions) → `server/` (all data access, `server-only`) → `lib/` (pure logic). ESLint enforces the direction. Pages read through `getViewer()` and `server/` queries. Actions only validate, authorize, call `server/`, and revalidate. Each one wraps its body in `runAction` and returns `ActionResult<T>`. Throw `UserError` for messages users should see. Details and an "adding a feature" walkthrough: `docs/architecture.md`.

## Don't break production

- Every exported `"use server"` function is a public endpoint, and the service-role key bypasses RLS. Authorize every action with `requireMember`/`requireAdmin` (`server/authz.ts`).
- The Supabase MCP tools point at **production**. Use `npm run db:sql` for local data, and apply migrations only when asked.
- Migrations go live before the code that uses them, so they must work with the deployed code.
- Merging to `main` deploys to production. CI and staging previews: `docs/ci-and-previews.md`.
- Render book descriptions as HTML only via `sanitizeDescription`. OverDrive/Libby lookups (`lib/libraries/overdrive.ts`) use undocumented endpoints: fail soft and never send patron data.

## UI

Server Components by default. Read `DESIGN_GUIDE.md` before UI work. Show errors with `components/ui/alert.tsx`.
