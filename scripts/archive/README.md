# Archived one-off scripts

These scripts were written for one-time data fixes and migrations that have
already been run against production. They are kept for reference only, are
excluded from linting (but still type-checked by `tsc`), and should **not** be re-run without
reading them first: most write to the database with the service-role key, and
several are hard-coded to a specific club.

| Script                       | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `add-meetings.ts`            | Bulk-imported the original club's past meetings.                          |
| `clean-duplicates.ts`        | Deleted duplicate meetings created by the import.                         |
| `consolidate-themes.ts`      | Merged fuzzy-duplicate themes and repointed meetings/votes.               |
| `fix-book-descriptions.ts`   | Normalized HTML/encoding in stored book descriptions.                     |
| `migrate-to-open-library.ts` | Converted Google Books records to Open Library IDs.                       |
| `update-book-metadata.ts`    | Backfilled descriptions/page counts from Google Books (pre-Open Library). |
| `update-design-tokens.js`    | Rewrote slate/blue Tailwind classes to the rust/gold/cream palette.       |

Run TypeScript scripts from the repo root with `npx tsx scripts/archive/<name>.ts`
(they read `.env.local`).
