-- Secret tokens for per-member calendar (ICS) feeds. Calendar apps fetch the
-- feed without a session, so the token in the URL is the credential. One token
-- per member per club: a member can reset theirs without affecting anyone, and
-- the feed re-checks membership on every fetch, so removed members lose access.
--
-- Purely additive: no existing tables or functions change, so this is safe to
-- apply before the code that uses it deploys.

CREATE TABLE public.calendar_feed_tokens (
  token text PRIMARY KEY CHECK (token ~ '^[A-Za-z0-9_-]{43}$'),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_club_id)
);

CREATE INDEX idx_calendar_feed_tokens_book_club_id
  ON public.calendar_feed_tokens(book_club_id);

-- Same model as every other table: RLS on, no policies, service role only.
ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_feed_tokens FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.calendar_feed_tokens TO service_role;
