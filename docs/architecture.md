# Architecture

Four layers in two kinds of workspace. Each layer imports only from the layers below it; ESLint enforces the boundaries (`eslint.config.mjs`), and type-only imports may cross them so DTO types have one definition.

| Layer                                            | Holds                                                                                                        | Must not                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `apps/web/app/`: pages, `app/actions/`           | Routes, and `"use server"` endpoints                                                                         | Query the database directly                                                      |
| `apps/web/server/` (`server-only`)               | Every query and write, DTO types, rules that need data, and operation implementations (`server/operations/`) | Import actions or UI                                                             |
| `packages/contract` (`@readers-choice/contract`) | Operation contracts: names, zod input schemas, output types, invalidation keys                               | Import anything but zod and `packages/core`                                      |
| `packages/core` (`@readers-choice/core`)         | Pure, isomorphic, unit-tested logic and external API clients                                                 | Import app code or `packages/contract`, create DB clients, or use Node built-ins |
| `packages/tokens` (`@readers-choice/tokens`)     | Design tokens (palette, semantic colors, typefaces). `apps/web/app/globals.css` mirrors them; a test checks  | Import anything                                                                  |

`apps/mobile` (Expo) sits beside `apps/web` at the top: it may import the packages, never the website's code, the database or Node built-ins, and reaches data only through `/api/v1` (see Mobile sign-in below and `apps/mobile/README.md`).

The packages are shared with the mobile app (#75), which has no Node runtime, so ESLint bans Node built-ins (`crypto`, `fs`, …) and `bcryptjs` there. Node-only helpers such as `apps/web/server/password.ts` and `apps/web/server/invite-code.ts` live in the web app. The packages ship TypeScript source (`exports` in each `package.json`); Next compiles them through `transpilePackages`.

Paths below without a prefix are inside `apps/web`, where `@/` imports resolve.

## Request paths

**Page (read):** `getViewer()` (session + typed client, cached per request) → a `server/<domain>.ts` query that takes the viewer, checks membership itself, and returns DTOs → render. Pages never call server actions to read.

**Screen read model (a page the mobile app also shows):** a `query` operation returns everything the screen needs, already authorized, including per-item permissions computed with the same rule the matching write enforces (`canDelete` from `themeDeletionBlocker` in `packages/core/themes.ts`). The page loads it with `loadPageData(op, input, { onRefused })` (`apps/web/app/_operations/page-data.ts`), and mobile calls the same operation over `/api/v1`, so both clients show the same data and permissions. The output schema is the screen's DTO; components import its type from `@readers-choice/contract/<domain>`. Domain contract modules export only contracts at runtime (types are fine), because the registry and the snapshot treat every runtime export as an operation. Pilot: the Themes page (`themes.list`). Move other screens over as their domains become operations.

**Operation (write, or a read a client component needs):** an operation is declared once and served to every client. The web calls it as a server action; other clients (the mobile app, #75) call the same operation over HTTP at `POST /api/v1/<name>`.

```ts
// packages/contract/themes.ts: what clients see. zod schemas in and out.
export const deleteTheme = defineContract({
  name: "themes.delete",
  kind: "mutation",
  input: z.object({ themeId: rowId }),
  output: z.void(),
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

- `executeOperation` (`apps/web/server/operation.ts`) rejects signed-out callers, parses the input with the contract's schema (the first issue's message is the error), runs the implementation, parses its return value with the output schema, and returns `{ success: true, data } | { success: false, error, code }` (`ActionResult`, `packages/contract/result.ts`). Output parsing strips undeclared fields, so a DTO never leaks a column the contract doesn't name. An output that doesn't match is a bug: it's logged and the client gets the fallback error.
- `code` is for clients to branch on; `error` is for people. The codes: `unauthenticated`, `invalid_input`, `refused` (a `UserError`), `internal` (anything else), plus `unavailable` and `bad_request` from the client and transport. Don't match on message text.
- Throw `UserError` (`packages/core/user-error.ts`) for messages users should see. Any other error is logged, and the client gets only the fallback message. `throwIfDbError` maps our Postgres functions' error codes to `UserError`s.
- The schema guards the shape; the implementation still authorizes the viewer for the resource (`apps/web/server/authz.ts`). Every operation is a public endpoint.
- Query contracts declare `cacheKey(input)`, built from the same `keys`. Mobile caches query results under it (TanStack Query), so the keys a write returns refetch exactly the right screens. The web maps each key to pages in `pathsFor` (`apps/web/app/_operations/revalidate.ts`), and TypeScript fails the build if a key has no pages.
- `ctx.invalidate(...)` takes keys from `packages/contract/keys.ts`. Both transports revalidate the web pages behind each key (`pathsFor` in `apps/web/app/_operations/revalidate.ts`), so a change made on mobile also refreshes the website. The HTTP response returns the keys for mobile to use as query keys. Add a key and its paths together.
- Transports live in `apps/web/app/_operations/`: `serverAction(op)` for the web and `handleOperationRequest` for `/api/v1`. The HTTP route takes a JSON body, refuses a foreign `Origin` (403) and non-JSON bodies (415) because browsers send the session cookie, and returns the `ActionResult` plus `invalidate`. The status follows the code: 200 on success or `refused`, 401 `unauthenticated`, 400 `invalid_input`, 500 `internal`, and 404 for an unknown name. `createOperationClient` (`packages/contract/client.ts`) is the typed client for it.
- `packages/contract/index.ts` and `apps/web/server/operations/index.ts` list every domain; a test fails if a contract has no implementation.
- `packages/contract/contracts.snapshot.json` is the public API as JSON Schema, checked by `packages/contract/snapshot.test.ts`. A diff there is an API change, and installed mobile apps keep calling the old shape: adding an operation, an optional input field or an output field is safe; renaming or removing anything, or tightening an input, needs a new operation name. Update it with `npx vitest run -u packages/contract`.

Domains not yet moved to operations still write the action body inline with `runAction` (`apps/web/server/action.ts`): same error handling, positional arguments, and `revalidatePath` in the action. Move a domain over when you change it. ESLint only allows `runAction` in the files listed in `eslint.config.mjs`; remove a file's line once it's migrated, and never add one.

## Mobile sign-in

The web signs in with NextAuth (session cookie). The mobile app signs in at `POST /api/v1/auth/{password,google,refresh,sign-out}` (`apps/web/app/_operations/auth-http.ts`; request schemas and the `Session` shape in `packages/contract/auth.ts`) and calls operations with `Authorization: Bearer <accessToken>`.

- The app's side is `apps/mobile/src/auth/session.ts`: the refresh token in the keychain, the access token in memory, one refresh at a time (the server revokes a session when a replaced refresh token is replayed), one retry after `unauthenticated`.
- `/api/v1` answers CORS preflights with `Access-Control-Allow-Origin: *` and never allows credentials (`apps/web/app/_operations/cors.ts`). Bearer requests may come from any origin, since they never use the cookie. Cookie requests must still be same-origin JSON, which is what stops request forgery.
- `getRequestViewer` (`apps/web/server/viewer.ts`) resolves `/api/v1` callers: a bearer token if one is sent (a bad one is never "rescued" by a cookie), else the cookie. Operations don't know or care which.
- Access tokens are 15-minute HS256 JWTs signed with a key HKDF-derived from `AUTH_SECRET` (`derivedKey` in `apps/web/server/tokens.ts`; audience `readers-choice-mobile`), not checked against the database, so revocation takes effect within 15 minutes. Refresh tokens are random, stored only as SHA-256 hashes in `mobile_sessions`, replaced on every refresh, and dead after 90 days without one (`apps/web/server/mobile-sessions.ts`). Replaying a replaced token revokes the session, except within 60 seconds, which covers the app's own concurrent refreshes.
- Google: the app sends the ID token from native Google Sign-In. `verifyGoogleIdToken` checks it against Google's keys and the client IDs in `GOOGLE_MOBILE_CLIENT_IDS`, and the account is linked exactly as on the web (`upsertGoogleAccount`).
- Password sign-in, web and mobile alike, goes through `checkPasswordSignIn` (`apps/web/server/password-sign-in.ts`): rate-limited per IP and per email (one email bucket for both clients), one message for every failure, and a bcrypt comparison even for unknown accounts so timing doesn't reveal them.
- Linking Google to an account created with a password drops the password and revokes the account's mobile sessions and connected apps, since the password may have been set by someone who pre-registered the address. An email linked to a different Google account is refused. Sign in with Apple comes before the App Store launch, not before TestFlight (#75).

## MCP server and OAuth

AI apps (Claude, ChatGPT, VS Code, …) reach the site through the MCP server at `POST /api/mcp` (`apps/web/app/_operations/mcp.ts`), a third transport for operations beside server actions and `/api/v1`. Every operation is a tool (`clubs.join` → `clubs_join`, described by the contract's `description`), dispatched through `executeOperation`, so authorization, input parsing and output filtering are the same as on the other transports. `mcpOperations` (`apps/web/server/operations/index.ts`) leaves out `connectedApps`: an app must not manage its own access. The endpoint is stateless (MCP 2026-07-28 through `@modelcontextprotocol/server`'s `createMcpHandler`, with 2025-era clients served by its stateless fallback) and never reads cookies.

The site is its own OAuth 2.1 authorization server (`apps/web/server/oauth/`); the SDK only covers the resource-server side.

- Discovery: `/.well-known/oauth-protected-resource/api/mcp` (RFC 9728) names the issuer, the site's origin; `/.well-known/oauth-authorization-server` (RFC 8414) lists the endpoints. A request without a valid token gets 401 with a `WWW-Authenticate` challenge pointing there. Everything derives from the request's origin (`siteOrigin`), so each deployment issues tokens only for itself.
- Clients are public (no secrets; PKCE S256 is required). They register through Client ID Metadata Documents (the client_id is an HTTPS URL we fetch through an SSRF-guarded client, `client-metadata.ts`) or Dynamic Client Registration (`POST /api/oauth/register`, open and rate-limited, so a registered name proves nothing). Redirect URIs must be HTTPS or loopback; loopback ones may change port (RFC 8252).
- Consent: `/oauth/authorize` (signed-in users only; the proxy keeps the query through login) shows where approving sends access and lets the user withhold `write`. Its Allow/Cancel is a server action, not an operation, so a token holder can't approve apps without the screen. The page can't be framed.
- Tokens: codes live 5 minutes, single use, hashed; reusing one revokes what it granted. Access tokens are 1-hour HS256 JWTs with a key HKDF-derived from `AUTH_SECRET` for this purpose alone, audience the deployment's MCP URL, and the grant is checked on every request, so disconnecting in Settings takes effect immediately. Refresh tokens rotate exactly like mobile sessions, bound to their client and resource. Neither token kind verifies as the other or as a mobile token.
- Scopes: `read` (always granted), `write` and `admin`. Mutations need `write`; without it the tool call fails with a message saying so. Without `admin`, which the consent screen leaves unticked, every tool call runs inside `withoutAdminPowers` (`apps/web/server/authz.ts`): `getMembership` and `isSuperAdmin` report an ordinary member, so the app acts as the user minus their club-admin and super-admin powers. Any new admin check must go through those two functions. `clubs.delete` is never offered over MCP, admin or not.

## Adding a feature

1. Schema change? Follow the database-migrations skill, then `npm run db:types`.
2. Put queries and writes in the matching `server/<domain>.ts`, or add a domain module. Map rows to camelCase DTOs there and export the DTO type.
3. Pure rules (phases, validation, scoring) go in `packages/core/` with unit tests. Example: `packages/core/meeting-schedule.ts` is the only place that decides whether nominations or voting are open.
4. Reads for a page: call the query from the page. Mutations (and reads a client component needs): add an operation as above, in the domain's `packages/contract/`, `apps/web/server/operations/` and `apps/web/app/actions/` files.
5. Components `import type` DTOs from `apps/web/server/`. Call operations with `useAction` (`apps/web/hooks/use-action.ts`), which tracks pending (through the follow-up refresh) and error state and refreshes server data on success. Use `useDebouncedSearch` for search-as-you-type. Prefer loading data in the page (e.g. a `?year=` param) over fetching in effects.

## Data access

- The client is `createAdminClient()` / `Db` from `apps/web/server/db.ts`, typed by the generated `apps/web/server/database.types.ts`. Joins in `select()` strings are typed too, so don't cast query results. A type that looks wrong means the select or the schema is wrong.
- The service-role key bypasses RLS (there are no policies), so authorization is always in code: `requireMember` / `requireAdmin` / `isSuperAdmin` in `apps/web/server/authz.ts`.
- Writes spanning rows that must change together go through Postgres functions (`db.rpc`), which re-check their preconditions atomically.

## Tests

- Unit tests sit next to the code (`*.test.ts`) and run offline with `npm run test:run`. `apps/web/server/` tests use the chainable fake in `apps/web/test/fake-db.ts`.
- `*.integration.test.ts` hit live APIs (`npm run test:integration`).
- `apps/web/e2e/` holds Playwright smoke specs that only read seed data.
