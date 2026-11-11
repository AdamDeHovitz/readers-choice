# Architecture

Four layers. Each imports only from the layers below it; ESLint enforces the boundaries (`eslint.config.mjs`), and type-only imports may cross them so DTO types have one definition.

| Layer                        | Holds                                                                                                        | Must not                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `app/` pages, `app/actions/` | Routes, and `"use server"` endpoints                                                                         | Query the database directly                               |
| `server/` (`server-only`)    | Every query and write, DTO types, rules that need data, and operation implementations (`server/operations/`) | Import actions or UI                                      |
| `contract/`                  | Operation contracts: names, zod input schemas, output types, invalidation keys                               | Import anything but zod and `lib/`                        |
| `lib/`                       | Pure, isomorphic, unit-tested logic and external API clients                                                 | Import app code, create DB clients, or use Node built-ins |

`contract/` and `lib/` will be shared with the mobile app (#75), which has no Node runtime, so ESLint bans Node built-ins (`crypto`, `fs`, …) and `bcryptjs` there. Node-only helpers such as `server/password.ts` and `server/invite-code.ts` live in `server/`.

## Request paths

**Page (read):** `getViewer()` (session + typed client, cached per request) → a `server/<domain>.ts` query that takes the viewer, checks membership itself, and returns DTOs → render. Pages never call server actions to read.

**Operation (write, or a read a client component needs):** an operation is declared once and served to every client. The web calls it as a server action; other clients (the mobile app, #75) call the same operation over HTTP at `POST /api/v1/<name>`.

```ts
// contract/themes.ts: what clients see. zod schema in, output type out.
export const deleteTheme = defineContract()({
  name: "themes.delete",
  kind: "mutation",
  input: z.object({ themeId: rowId }),
});

// server/operations/themes.ts: authorize, call server/, say what's stale.
export const deleteTheme = implement(
  contract.deleteTheme,
  "Failed to delete theme",
  async (ctx, { themeId }) => {
    const theme = await themes.getThemeContext(ctx.db, themeId); // UserError if missing
    const membership = await requireMember(
      ctx.db,
      theme.bookClubId,
      ctx.userId
    );
    if (theme.submittedBy !== ctx.userId && !membership.isAdmin) {
      throw new UserError(
        "You can only delete themes you submitted or be an admin"
      );
    }
    await themes.deleteUnusedTheme(ctx.db, theme); // server/ owns the write
    ctx.invalidate(keys.clubThemes(theme.bookClubId));
  }
);

// app/actions/themes.ts ("use server"): the web transport.
export const deleteTheme = serverAction(themes.deleteTheme);
```

- `executeOperation` (`server/operation.ts`) rejects signed-out callers, parses the input with the contract's schema (the first issue's message is the error), runs the implementation, and returns `{ success: true, data } | { success: false, error }` (`ActionResult`, `contract/result.ts`).
- Throw `UserError` (`lib/user-error.ts`) for messages users should see. Any other error is logged, and the client gets only the fallback message. `throwIfDbError` maps our Postgres functions' error codes to `UserError`s.
- The schema guards the shape; the implementation still authorizes the viewer for the resource (`server/authz.ts`). Every operation is a public endpoint.
- `ctx.invalidate(...)` takes keys from `contract/keys.ts`. Both transports revalidate the web pages behind each key (`pathsFor` in `app/_operations/revalidate.ts`), so a change made on mobile also refreshes the website. The HTTP response returns the keys for mobile to use as query keys. Add a key and its paths together.
- Transports live in `app/_operations/`: `serverAction(op)` for the web and `handleOperationRequest` for `/api/v1`. The HTTP route takes a JSON body, refuses a foreign `Origin` (403) and non-JSON bodies (415) because browsers send the session cookie, and returns 401 when signed out, 400 for invalid input, 404 for an unknown name, and otherwise 200 with the `ActionResult` plus `invalidate`. `createOperationClient` (`contract/client.ts`) is the typed client for it.
- `contract/index.ts` and `server/operations/index.ts` list every domain; a test fails if a contract has no implementation.

Domains not yet moved to operations still write the action body inline with `runAction` (`server/action.ts`): same error handling, positional arguments, and `revalidatePath` in the action. Move a domain over when you change it.

## Adding a feature

1. Schema change? Follow the database-migrations skill, then `npm run db:types`.
2. Put queries and writes in the matching `server/<domain>.ts`, or add a domain module. Map rows to camelCase DTOs there and export the DTO type.
3. Pure rules (phases, validation, scoring) go in `lib/` with unit tests. Example: `lib/meeting-schedule.ts` is the only place that decides whether nominations or voting are open.
4. Reads for a page: call the query from the page. Mutations (and reads a client component needs): add an operation as above, in the domain's `contract/`, `server/operations/` and `app/actions/` files.
5. Components `import type` DTOs from `server/`. Call operations with `useAction` (`hooks/use-action.ts`), which tracks pending (through the follow-up refresh) and error state and refreshes server data on success. Use `useDebouncedSearch` for search-as-you-type. Prefer loading data in the page (e.g. a `?year=` param) over fetching in effects.

## Data access

- The client is `createAdminClient()` / `Db` from `server/db.ts`, typed by the generated `server/database.types.ts`. Joins in `select()` strings are typed too, so don't cast query results. A type that looks wrong means the select or the schema is wrong.
- The service-role key bypasses RLS (there are no policies), so authorization is always in code: `requireMember` / `requireAdmin` / `isSuperAdmin` in `server/authz.ts`.
- Writes spanning rows that must change together go through Postgres functions (`db.rpc`), which re-check their preconditions atomically.

## Tests

- Unit tests sit next to the code (`*.test.ts`) and run offline with `npm run test:run`. `server/` tests use the chainable fake in `test/fake-db.ts`.
- `*.integration.test.ts` hit live APIs (`npm run test:integration`).
- `e2e/` holds Playwright smoke specs that only read seed data.
