---
name: database-migrations
description: Add or change the Readers' Choice Postgres schema (tables, columns, constraints, database functions) and ship it safely to production. Use for any change under supabase/migrations/, for regenerating database types, or when seed data needs new columns.
---

# Database migrations

Production is the only deployed database. Deploys never run migrations, and a migration goes live **before** the code that uses it. Every migration must therefore keep the currently deployed code working. CI's Migration compat job checks exactly that.

## Steps

1. **Write it.** Add `supabase/migrations/<timestamp>_<name>.sql`. For a breaking change, split it: an additive migration now, and the cleanup in a later PR once no deployed code depends on the old shape.
2. **Test it locally.**

   ```bash
   npm run db:reset    # re-runs every migration plus the seed
   npm run db:types    # regenerates server/database.types.ts (CI fails if stale)
   ```

   Update `supabase/seed.sql` if the new schema needs seed data. Then run `npm run typecheck`, since new types often surface code that needs updating.

3. **Database functions:** raise stable error codes (e.g. `RAISE EXCEPTION 'voting_closed'`) and map them in `DB_ERROR_MESSAGES` (`apps/web/server/errors.ts`). Callers use `throwIfDbError`. Re-check preconditions inside the function so the write stays atomic.
4. **Open the PR** and wait for CI, including Migration compat. To try the change on a Vercel preview, see `docs/ci-and-previews.md`.
5. **Apply to production** (only when the user asks): use the Supabase MCP `apply_migration` tool. Then `list_migrations` to read the version it recorded, and rename the local file to `supabase/migrations/<version>_<name>.sql` so the history matches.

## Reading the schema

Read `supabase/migrations/` or `apps/web/server/database.types.ts`. For production, the Supabase MCP `list_tables` and read-only `execute_sql` work. For local data, use `npm run db:sql`.
