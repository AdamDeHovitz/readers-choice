# Architecture

Three layers. Each imports only from the layers below it; ESLint enforces the boundaries (`eslint.config.mjs`), and type-only imports may cross them so DTO types have one definition.

| Layer                        | Holds                                                        | Must not                             |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| `app/` pages, `app/actions/` | Routes, and `"use server"` endpoints                         | Query the database directly          |
| `server/` (`server-only`)    | Every query and write, DTO types, rules that need data       | Import actions or UI                 |
| `lib/`                       | Pure, isomorphic, unit-tested logic and external API clients | Import app code or create DB clients |

## Request paths

**Page (read):** `getViewer()` (session + typed client, cached per request) → a `server/<domain>.ts` query that takes the viewer, checks membership itself, and returns DTOs → render. Pages never call server actions to read.

**Action (write, or a read a client component needs):**

```ts
export async function doThing(
  id: string,
  input: Input
): Promise<ActionResult<Out>> {
  return runAction("Failed to do thing", async ({ db, userId }) => {
    const parsed = requiredText(input?.name, "Name is required"); // server/input.ts
    const meeting = await getMeetingContext(db, id); // throws UserError if missing
    await requireAdmin(
      db,
      meeting.bookClubId,
      userId,
      "Only admins can do thing"
    );
    const out = await meetings.doThing(db, meeting, parsed); // server/ owns the write
    revalidatePath(`/meetings/${id}`);
    return out;
  });
}
```

- `runAction` (`server/action.ts`) rejects signed-out callers and returns `{ success: true, data } | { success: false, error }`.
- Throw `UserError` (`lib/user-error.ts`) for messages users should see. Any other error is logged, and the client gets only the fallback message. `throwIfDbError` maps our Postgres functions' error codes to `UserError`s.
- Action arguments are untrusted client input whatever their TypeScript types say. Validate them with `server/input.ts` or domain checks.

## Adding a feature

1. Schema change? Follow the database-migrations skill, then `npm run db:types`.
2. Put queries and writes in the matching `server/<domain>.ts`, or add a domain module. Map rows to camelCase DTOs there and export the DTO type.
3. Pure rules (phases, validation, scoring) go in `lib/` with unit tests. Example: `lib/meeting-schedule.ts` is the only place that decides whether nominations or voting are open.
4. Reads for a page: call the query from the page. Mutations: add an action as above.
5. Components `import type` DTOs from `server/` and call actions; they branch on `result.success`.

## Data access

- The client is `createAdminClient()` / `Db` from `server/db.ts`, typed by the generated `server/database.types.ts`. Joins in `select()` strings are typed too, so don't cast query results. A type that looks wrong means the select or the schema is wrong.
- The service-role key bypasses RLS (there are no policies), so authorization is always in code: `requireMember` / `requireAdmin` / `isSuperAdmin` in `server/authz.ts`.
- Writes spanning rows that must change together go through Postgres functions (`db.rpc`), which re-check their preconditions atomically.

## Tests

- Unit tests sit next to the code (`*.test.ts`) and run offline with `npm run test:run`. `server/` tests use the chainable fake in `test/fake-db.ts`.
- `*.integration.test.ts` hit live APIs (`npm run test:integration`).
- `e2e/` holds Playwright smoke specs that only read seed data.
