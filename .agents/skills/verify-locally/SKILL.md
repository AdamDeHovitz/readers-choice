---
name: verify-locally
description: Run Readers' Choice against the local Supabase stack and seed data, log in as seed users, drive flows in a real browser, check the database, and run the e2e smoke specs. Use to verify a UI or data change before committing, to reproduce a bug, or when asked to run or test the app.
---

# Verify a change locally

The local stack (Docker) mirrors production's schema, and `supabase/seed.sql` fills it with test data. Nothing here touches production, unless you point the app at `.env.local`; see Pitfalls.

## 1. Start

```bash
npm run db:reset     # every migration plus the seed (see Pitfalls before resetting)
npm run dev:local    # starts the stack if needed; app on http://localhost:3000
```

Seed dates are relative to the reset time, so reset again if the phases look stale.

## 2. Log in

Use email/password (Google sign-in doesn't work locally). Every password is `password123`.

| User                                     | Role                                   |
| ---------------------------------------- | -------------------------------------- |
| `alice@example.test`                     | Seed Club admin and global super admin |
| `bob@example.test`, `carol@example.test` | Seed Club members                      |
| `dave@example.test`                      | Other Club admin, not in Seed Club     |

`e2e/seed.ts` has the meeting IDs, one meeting per phase: finalized, voting closed, voting open, nominating. Seed Club's invite link is `/join/seedInviteCode00000000`.

## 3. Drive the flow

- Use Playwright with accessibility snapshots rather than screenshots. Prefer the Playwright MCP tools. If they're unavailable, write a short script with the `playwright` package; `e2e/seed.ts` has a `logIn` helper to copy.
- Check every mutation in the database, not just the UI:

  ```bash
  npm run db:sql -- -c "select id, is_finalized from meetings"
  ```

  The Supabase MCP tools point at **production**; never use them for local data.

- Studio (a browser UI for local data) is at http://127.0.0.1:54323.

## 4. Run the smoke specs

```bash
npm run db:reset && npm run test:e2e   # mobile viewport; specs only read seed data
```

Reset first if you mutated data: e.g. joining Seed Club as dave breaks the non-member spec. Add a spec to `e2e/` when a flow is worth guarding.

## 5. Record it

Paste what you observed (snapshot text, URLs, `db:sql` output) into the PR's `verifications/<pr-number>.md`; `verifications/README.md` has the format and evidence standards.

## Pitfalls

- **One local stack for every checkout and worktree.** A `db:reset` wipes whatever another session is in the middle of. Reset when you need to (a new migration, or seed state that has drifted from `supabase/seed.sql`), and undo test data you write once you've checked it, so the seed stays as documented.
- **Port 3000 may already be serving.** `test:e2e` reuses any server on :3000 (`reuseExistingServer`). A server started with plain `npm run dev` uses `.env.local`, which can point at production. Check what's running (`lsof -i :3000`) before running specs or mutating data.
- **Need a second server?** Don't start another dev server in the same checkout, since they share `.next`. Create a git worktree, copy `node_modules` into it (`cp -cR` on macOS; Turbopack rejects a symlinked `node_modules`), then run `PORT=3100 scripts/dev-local.sh` there, and `PORT=3100 npm run test:e2e` to run the specs against it.
- **Build fails right after many file changes while a dev server runs in this checkout?** They share `.next`; rerun the build before debugging.
- **Production build check:** `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co SUPABASE_SERVICE_ROLE_KEY=dummy npm run build`.
