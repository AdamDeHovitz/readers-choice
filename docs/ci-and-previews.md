# CI, previews and deploys

## PR checks

CI (`.github/workflows/ci.yml`) never touches production. It uses dummy env vars and a throwaway local Supabase stack.

- **Every PR:** Lint, Test, Build, and E2E. E2E runs this PR's code on its own migrations and seed, and first checks that `server/database.types.ts` matches the migrations.
- **Speed (E2E and Migration compat):** Supabase is the slowest step, so it starts first, in the background (`scripts/ci-background.sh`), and the app builds while it starts. The specs run against that build (`E2E_PREBUILT=1` → `scripts/dev-local.sh --prebuilt`) instead of `next dev`.
- **Migration compat** (only when `supabase/migrations/` changes): loads main's migrations and seed, applies the PR's migrations on top (production's order), then runs main's app and main's e2e specs. A failure means the migration would break the deployed code.
- **Verification** (`.github/workflows/verification.yml`, every PR): fails a PR marked ready for review unless `verifications/<pr-number>.md` has all its sections filled in (`verifications/README.md`). Drafts get a warning. Its run also warns when the PR changes the check itself, or when files changed after the verification file was last updated.
- Each e2e job uploads a Playwright HTML report (a screenshot per test, traces on failure, kept 14 days) and writes pass/fail counts plus the report link to the job summary. To view it: `gh run download <run-id> -n e2e-report -D report && npx playwright show-report report`.

## Deploys

Merging to `main` deploys to production (https://readers-choice.vercel.app). Deploys never run migrations. Vercel preview URLs are behind SSO.

## Preview database (staging)

Vercel previews use a shared **staging** Supabase project, never production. Staging also hosts wedding-map and root-registry in their own schemas (`wedding_map`, `root_registry`). Readers-choice owns `public`, and the reset only touches `public`.

- Add the `preview` label to a PR to load its migrations and seed into staging (`.github/workflows/preview-db.yml`, using `supabase/staging-reset.sql`). It reloads on every push while labeled and moves the label off any other PR, so only one PR owns staging at a time. Unlabeled previews see whatever schema was last loaded.
- Log in on a preview with the seed users (`alice@example.test` / `password123`). Google sign-in doesn't work on preview URLs.
- A daily keep-alive cron (`/api/keep-alive`) pings production and staging so neither free-tier project pauses.
