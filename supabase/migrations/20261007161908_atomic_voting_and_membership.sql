-- Atomic write paths for voting, personal rankings, and admin membership changes.
--
-- Each function runs in a single transaction, so a failed write can no longer
-- leave a ballot half-deleted, and concurrent requests are serialized with row
-- or advisory locks. The server actions call these via supabase.rpc() with the
-- service-role key; they are not callable by anon/authenticated.
--
-- Errors are raised with short stable messages (e.g. 'voting_closed') that the
-- server actions translate into user-facing text.
--
-- Purely additive: no existing tables, columns, or policies change.

-- ---------------------------------------------------------------------------
-- Voting window
-- ---------------------------------------------------------------------------

-- Locks the meeting row (FOR SHARE, so finalization waits for in-flight votes)
-- and verifies voting is open and the user is a member. Returns book_club_id.
-- Voting is open until the meeting is finalized or voting_deadline has passed,
-- matching getBookClubState().
CREATE OR REPLACE FUNCTION public.assert_meeting_voting_open(
  p_meeting_id uuid,
  p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_book_club_id uuid;
  v_is_finalized boolean;
  v_voting_deadline timestamptz;
BEGIN
  SELECT book_club_id, is_finalized, voting_deadline
    INTO v_book_club_id, v_is_finalized, v_voting_deadline
    FROM meetings
   WHERE id = p_meeting_id
     FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'meeting_not_found';
  END IF;

  IF COALESCE(v_is_finalized, false)
     OR (v_voting_deadline IS NOT NULL AND now() > v_voting_deadline) THEN
    RAISE EXCEPTION 'voting_closed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM members
     WHERE book_club_id = v_book_club_id
       AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  RETURN v_book_club_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Approval vote toggle
-- ---------------------------------------------------------------------------

-- Toggles the user's approval vote on a book option. Returns true when the
-- user now has a vote on the option, false when it was removed.
CREATE OR REPLACE FUNCTION public.toggle_book_vote(
  p_book_option_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_meeting_id uuid;
BEGIN
  SELECT meeting_id INTO v_meeting_id
    FROM book_options
   WHERE id = p_book_option_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'book_option_not_found';
  END IF;

  PERFORM assert_meeting_voting_open(v_meeting_id, p_user_id);

  -- Serialize toggles by the same user on the same option
  PERFORM pg_advisory_xact_lock(
    hashtextextended('vote:' || p_book_option_id::text || ':' || p_user_id::text, 0)
  );

  DELETE FROM votes
   WHERE book_option_id = p_book_option_id
     AND user_id = p_user_id;

  IF FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO votes (book_option_id, user_id)
  VALUES (p_book_option_id, p_user_id)
  ON CONFLICT (book_option_id, user_id) DO NOTHING;

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Voting method preference
-- ---------------------------------------------------------------------------

-- Sets the user's voting method for a meeting, clearing ballots cast with the
-- other method so a user is only ever counted in one pool.
CREATE OR REPLACE FUNCTION public.set_meeting_voting_method(
  p_meeting_id uuid,
  p_user_id uuid,
  p_method text
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_method NOT IN ('approval', 'ranked') THEN
    RAISE EXCEPTION 'invalid_voting_method';
  END IF;

  PERFORM assert_meeting_voting_open(p_meeting_id, p_user_id);

  PERFORM pg_advisory_xact_lock(
    hashtextextended('ballot:' || p_meeting_id::text || ':' || p_user_id::text, 0)
  );

  IF p_method = 'ranked' THEN
    DELETE FROM votes v
     USING book_options bo
     WHERE v.book_option_id = bo.id
       AND bo.meeting_id = p_meeting_id
       AND v.user_id = p_user_id;
  ELSE
    DELETE FROM meeting_ranked_votes
     WHERE meeting_id = p_meeting_id
       AND user_id = p_user_id;
  END IF;

  INSERT INTO meeting_voting_preferences (meeting_id, user_id, voting_method)
  VALUES (p_meeting_id, p_user_id, p_method)
  ON CONFLICT (meeting_id, user_id)
  DO UPDATE SET voting_method = EXCLUDED.voting_method;
END;
$$;

-- ---------------------------------------------------------------------------
-- Ranked ballot
-- ---------------------------------------------------------------------------

-- Replaces the user's ranked ballot for a meeting.
-- p_rankings: [{"book_option_id": uuid, "rank": int}, ...]
-- Ranks must be exactly 1..N with no duplicate options, and every option must
-- belong to the meeting. Also switches the user to the ranked method.
CREATE OR REPLACE FUNCTION public.save_meeting_ranked_votes(
  p_meeting_id uuid,
  p_user_id uuid,
  p_rankings jsonb
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_distinct_options int;
  v_distinct_ranks int;
  v_min_rank int;
  v_max_rank int;
  v_foreign_options int;
BEGIN
  IF p_rankings IS NULL OR jsonb_typeof(p_rankings) <> 'array' THEN
    RAISE EXCEPTION 'invalid_ballot';
  END IF;

  PERFORM assert_meeting_voting_open(p_meeting_id, p_user_id);

  PERFORM pg_advisory_xact_lock(
    hashtextextended('ballot:' || p_meeting_id::text || ':' || p_user_id::text, 0)
  );

  SELECT count(*),
         count(DISTINCT book_option_id),
         count(DISTINCT rank),
         min(rank),
         max(rank),
         count(*) FILTER (
           WHERE book_option_id IS NULL
              OR NOT EXISTS (
                SELECT 1 FROM book_options bo
                 WHERE bo.id = b.book_option_id
                   AND bo.meeting_id = p_meeting_id
              )
         )
    INTO v_count, v_distinct_options, v_distinct_ranks,
         v_min_rank, v_max_rank, v_foreign_options
    FROM (
      SELECT (e ->> 'book_option_id')::uuid AS book_option_id,
             (e ->> 'rank')::int AS rank
        FROM jsonb_array_elements(p_rankings) AS e
    ) AS b;

  IF v_foreign_options > 0
     OR v_distinct_options <> v_count
     OR v_distinct_ranks <> v_count
     OR (v_count > 0 AND (v_min_rank <> 1 OR v_max_rank <> v_count)) THEN
    RAISE EXCEPTION 'invalid_ballot';
  END IF;

  DELETE FROM meeting_ranked_votes
   WHERE meeting_id = p_meeting_id
     AND user_id = p_user_id;

  INSERT INTO meeting_ranked_votes (meeting_id, user_id, book_option_id, rank)
  SELECT p_meeting_id, p_user_id,
         (e ->> 'book_option_id')::uuid,
         (e ->> 'rank')::int
    FROM jsonb_array_elements(p_rankings) AS e;

  -- A user is counted in exactly one pool; drop any approval ballot
  DELETE FROM votes v
   USING book_options bo
   WHERE v.book_option_id = bo.id
     AND bo.meeting_id = p_meeting_id
     AND v.user_id = p_user_id;

  INSERT INTO meeting_voting_preferences (meeting_id, user_id, voting_method)
  VALUES (p_meeting_id, p_user_id, 'ranked')
  ON CONFLICT (meeting_id, user_id)
  DO UPDATE SET voting_method = EXCLUDED.voting_method;
END;
$$;

-- ---------------------------------------------------------------------------
-- Personal year rankings
-- ---------------------------------------------------------------------------

-- Replaces the user's rankings for a club/year.
-- p_ranked: [{"book_id": uuid, "rank": int}, ...] with ranks exactly 1..N.
-- p_unread: book ids marked "not read" (stored with rank NULL).
-- The server action additionally verifies every book was a finalized pick for
-- that club/year before calling this.
CREATE OR REPLACE FUNCTION public.save_year_rankings(
  p_user_id uuid,
  p_book_club_id uuid,
  p_year int,
  p_ranked jsonb,
  p_unread uuid[]
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_distinct_books int;
  v_distinct_ranks int;
  v_min_rank int;
  v_max_rank int;
  v_null_books int;
  v_overlap int;
  v_unread uuid[] := COALESCE(p_unread, ARRAY[]::uuid[]);
BEGIN
  IF p_ranked IS NULL OR jsonb_typeof(p_ranked) <> 'array' THEN
    RAISE EXCEPTION 'invalid_rankings';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM members
     WHERE book_club_id = p_book_club_id
       AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'rankings:' || p_user_id::text || ':' || p_book_club_id::text || ':' || p_year::text,
      0
    )
  );

  SELECT count(*),
         count(DISTINCT book_id),
         count(DISTINCT rank),
         min(rank),
         max(rank),
         count(*) FILTER (WHERE book_id IS NULL),
         count(*) FILTER (WHERE book_id = ANY (v_unread))
    INTO v_count, v_distinct_books, v_distinct_ranks,
         v_min_rank, v_max_rank, v_null_books, v_overlap
    FROM (
      SELECT (e ->> 'book_id')::uuid AS book_id,
             (e ->> 'rank')::int AS rank
        FROM jsonb_array_elements(p_ranked) AS e
    ) AS r;

  IF v_null_books > 0
     OR v_overlap > 0
     OR v_distinct_books <> v_count
     OR v_distinct_ranks <> v_count
     OR (v_count > 0 AND (v_min_rank <> 1 OR v_max_rank <> v_count))
     OR array_position(v_unread, NULL) IS NOT NULL
     OR (SELECT count(DISTINCT u) FROM unnest(v_unread) AS u) <> cardinality(v_unread) THEN
    RAISE EXCEPTION 'invalid_rankings';
  END IF;

  DELETE FROM personal_rankings
   WHERE user_id = p_user_id
     AND book_club_id = p_book_club_id
     AND year = p_year;

  INSERT INTO personal_rankings (user_id, book_club_id, book_id, year, rank)
  SELECT p_user_id, p_book_club_id,
         (e ->> 'book_id')::uuid, p_year, (e ->> 'rank')::int
    FROM jsonb_array_elements(p_ranked) AS e
  UNION ALL
  SELECT p_user_id, p_book_club_id, u, p_year, NULL
    FROM unnest(v_unread) AS u;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin membership changes
-- ---------------------------------------------------------------------------

-- Grants or revokes admin. Refuses to demote the club's last admin. The club
-- row is locked so concurrent demotions/removals cannot both pass the check.
-- Returns false if the target is not a member.
CREATE OR REPLACE FUNCTION public.set_member_admin(
  p_book_club_id uuid,
  p_user_id uuid,
  p_is_admin boolean
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current boolean;
BEGIN
  PERFORM 1 FROM book_clubs WHERE id = p_book_club_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'book_club_not_found';
  END IF;

  SELECT is_admin INTO v_current
    FROM members
   WHERE book_club_id = p_book_club_id
     AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF COALESCE(v_current, false) AND NOT p_is_admin AND (
    SELECT count(*) FROM members
     WHERE book_club_id = p_book_club_id
       AND is_admin = true
  ) <= 1 THEN
    RAISE EXCEPTION 'last_admin';
  END IF;

  UPDATE members
     SET is_admin = p_is_admin
   WHERE book_club_id = p_book_club_id
     AND user_id = p_user_id;

  RETURN true;
END;
$$;

-- Removes a member. Refuses to remove the club's last admin.
-- Returns false if the target is not a member.
CREATE OR REPLACE FUNCTION public.remove_club_member(
  p_book_club_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current boolean;
BEGIN
  PERFORM 1 FROM book_clubs WHERE id = p_book_club_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'book_club_not_found';
  END IF;

  SELECT is_admin INTO v_current
    FROM members
   WHERE book_club_id = p_book_club_id
     AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF COALESCE(v_current, false) AND (
    SELECT count(*) FROM members
     WHERE book_club_id = p_book_club_id
       AND is_admin = true
  ) <= 1 THEN
    RAISE EXCEPTION 'last_admin';
  END IF;

  DELETE FROM members
   WHERE book_club_id = p_book_club_id
     AND user_id = p_user_id;

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: server (service_role) only
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.assert_meeting_voting_open(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_book_vote(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_meeting_voting_method(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_meeting_ranked_votes(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_year_rankings(uuid, uuid, int, jsonb, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_member_admin(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_club_member(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assert_meeting_voting_open(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_book_vote(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_meeting_voting_method(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_meeting_ranked_votes(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_year_rankings(uuid, uuid, int, jsonb, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_member_admin(uuid, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_club_member(uuid, uuid) TO service_role;
