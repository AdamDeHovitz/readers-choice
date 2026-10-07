# Readers' Choice - Database Schema

A concise overview of the live Supabase (PostgreSQL) schema. **The source of
truth is `supabase/migrations/`** — read the migrations (or inspect the live
project) before relying on details here, and update this file when a migration
changes the shape of a table.

## Access model

- All app code talks to the database from the server with the **service-role
  key**, which bypasses Row Level Security. NextAuth sessions never set
  `auth.uid()`.
- **Authorization is enforced in server actions** (see `lib/safe-action.ts`
  and `app/actions/`), not by RLS.
- RLS is enabled on every table. The policies left over from the original
  schema only matter for direct anon/authenticated PostgREST access, which the
  app does not use. `users` has no policies and all privileges are revoked from
  `anon`/`authenticated`.

## Tables

All tables use a `uuid` primary key `id` (default `gen_random_uuid()`) and a
`created_at timestamptz` default `now()`. Tables marked † also have
`updated_at`, maintained by the `update_updated_at_column()` trigger.

| Table                          | Purpose / key columns                                                                                                                                                                                                                      | Uniqueness                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `users` †                      | `email`, `name`, `avatar_url`, `google_id` (Google OAuth), `password_hash` (email/password auth). Emails are stored lowercase.                                                                                                             | `email`, `lower(email)`, `google_id`                                   |
| `book_clubs` †                 | `name`, `description`, `created_by → users` (set null)                                                                                                                                                                                     |                                                                        |
| `members`                      | `book_club_id → book_clubs`, `user_id → users`, `is_admin`, `joined_at`                                                                                                                                                                    | `(user_id, book_club_id)`                                              |
| `invite_links`                 | `book_club_id → book_clubs`, `code`, `created_by → users` (set null), `expires_at`, `is_active`                                                                                                                                            | `code`                                                                 |
| `books` †                      | Shared catalog: `title`, `author`, `isbn`, `cover_url`, `description`, `published_year`, `page_count`, `external_id` + `external_source` (`open_library` or legacy `google_books`), `google_books_id` (legacy)                             | `(external_id, external_source)`                                       |
| `themes`                       | `book_club_id → book_clubs`, `name`, `description`, `submitted_by → users` (set null)                                                                                                                                                      | `(book_club_id, name)`                                                 |
| `theme_votes`                  | Theme upvotes: `theme_id → themes`, `user_id → users`                                                                                                                                                                                      | `(theme_id, user_id)`                                                  |
| `meetings` †                   | `book_club_id → book_clubs`, `meeting_date`, `details`, `theme_id → themes` (set null), `nomination_deadline`, `voting_deadline`, `selected_book_id → books` (set null), `is_finalized`, `finalized_at`, `finalized_by → users` (set null) |                                                                        |
| `book_options`                 | Nominations: `meeting_id → meetings`, `book_id → books`, `added_by → users` (set null), plus admin overrides `description_override`, `page_count_override`                                                                                 | `(meeting_id, book_id)`                                                |
| `votes` †                      | Approval votes: `book_option_id → book_options`, `user_id → users`                                                                                                                                                                         | `(book_option_id, user_id)`                                            |
| `meeting_ranked_votes` †       | Ranked-choice ballots: `meeting_id`, `user_id`, `book_option_id`, `rank` (≥ 1)                                                                                                                                                             | `(meeting_id, user_id, book_option_id)`, `(meeting_id, user_id, rank)` |
| `meeting_voting_preferences` † | Per-user ballot type for a meeting: `meeting_id`, `user_id`, `voting_method` (`approval` \| `ranked`, default `approval`)                                                                                                                  | `(meeting_id, user_id)`                                                |
| `personal_rankings` †          | Year rankings: `user_id`, `book_club_id`, `book_id`, `year`, `rank` (`NULL` = marked "not read")                                                                                                                                           | `(user_id, book_club_id, book_id, year)`                               |

Foreign keys cascade on delete unless marked "set null".

## Notes

- **Voting**: each member chooses approval or ranked voting per meeting
  (`meeting_voting_preferences`); ballots land in `votes` or
  `meeting_ranked_votes`. Results are tallied in application code
  (`lib/voting-algorithm.ts`), not in the database.
- **Global rankings** are computed in application code from
  `personal_rankings` (Borda-style scoring), not by database views or
  functions.
- **Books** are looked up via Open Library (primary) and Google Books, and
  cached in `books`. Per-meeting edits go in `book_options.*_override` rather
  than mutating the shared `books` row.
- There are no custom views or RPC functions; the only function is the
  `update_updated_at_column()` trigger.
