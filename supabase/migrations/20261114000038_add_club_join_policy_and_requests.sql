-- How people join a club, and requests to join.
--
-- join_policy:
--   invite_only  only through an invite link; the club is unlisted (default,
--                so every existing club keeps working exactly as before)
--   request      listed; anyone can ask, and an admin approves or declines
--   open         listed; anyone can join straight away
--
-- An invite link always admits its holder, whatever the policy.
--
-- join_requests holds at most one row per club and user. Approving deletes the
-- row and adds the member; cancelling deletes it; declining keeps it as
-- 'declined' so the same person can't ask again until a cooldown passes.
--
-- Purely additive: a column with a default, a new table and new functions, so
-- the deployed code keeps working before the code that uses them ships.

CREATE TYPE public.club_join_policy AS ENUM ('invite_only', 'request', 'open');

ALTER TABLE public.book_clubs
  ADD COLUMN join_policy public.club_join_policy NOT NULL DEFAULT 'invite_only';

CREATE TABLE public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message text CHECK (char_length(message) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (book_club_id, user_id)
);

CREATE INDEX idx_join_requests_pending
  ON public.join_requests (book_club_id, created_at)
  WHERE status = 'pending';
CREATE INDEX idx_join_requests_user_id ON public.join_requests (user_id);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.join_requests FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.join_requests TO service_role;

-- Join an open club, or ask to join a club that takes requests. Returns
-- 'joined' or 'requested'. Asking again while a request is pending just
-- updates its message. The club row is locked so a policy change can't slip
-- between the check and the write.
CREATE FUNCTION public.join_or_request_club(
  p_book_club_id uuid,
  p_user_id uuid,
  p_message text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_policy club_join_policy;
  v_status text;
  v_decided_at timestamptz;
BEGIN
  SELECT join_policy INTO v_policy
    FROM book_clubs WHERE id = p_book_club_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'book_club_not_found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM members
     WHERE book_club_id = p_book_club_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  IF v_policy = 'invite_only' THEN
    RAISE EXCEPTION 'club_invite_only';
  END IF;

  IF v_policy = 'open' THEN
    INSERT INTO members (book_club_id, user_id) VALUES (p_book_club_id, p_user_id);
    DELETE FROM join_requests
     WHERE book_club_id = p_book_club_id AND user_id = p_user_id;
    RETURN 'joined';
  END IF;

  SELECT status, decided_at INTO v_status, v_decided_at
    FROM join_requests
   WHERE book_club_id = p_book_club_id AND user_id = p_user_id;

  IF v_status = 'declined' AND v_decided_at > now() - interval '30 days' THEN
    RAISE EXCEPTION 'join_request_cooldown';
  END IF;

  INSERT INTO join_requests (book_club_id, user_id, message)
  VALUES (p_book_club_id, p_user_id, p_message)
  ON CONFLICT (book_club_id, user_id) DO UPDATE
    SET message = EXCLUDED.message,
        status = 'pending',
        created_at = CASE WHEN join_requests.status = 'pending'
                          THEN join_requests.created_at ELSE now() END,
        decided_at = NULL,
        decided_by = NULL;
  RETURN 'requested';
END;
$$;

-- Approve a pending request: the requester becomes a member. Returns false if
-- there's no pending request (already handled, or cancelled).
CREATE FUNCTION public.approve_join_request(
  p_book_club_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM join_requests
   WHERE book_club_id = p_book_club_id
     AND user_id = p_user_id
     AND status = 'pending';
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO members (book_club_id, user_id)
  VALUES (p_book_club_id, p_user_id)
  ON CONFLICT (user_id, book_club_id) DO NOTHING;
  RETURN true;
END;
$$;

-- Change who can join. Opening a club admits everyone waiting on a request.
CREATE FUNCTION public.set_club_join_policy(
  p_book_club_id uuid,
  p_policy club_join_policy
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE book_clubs SET join_policy = p_policy WHERE id = p_book_club_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'book_club_not_found';
  END IF;

  IF p_policy = 'open' THEN
    INSERT INTO members (book_club_id, user_id)
    SELECT book_club_id, user_id FROM join_requests
     WHERE book_club_id = p_book_club_id AND status = 'pending'
    ON CONFLICT (user_id, book_club_id) DO NOTHING;
    DELETE FROM join_requests
     WHERE book_club_id = p_book_club_id AND status = 'pending';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.join_or_request_club(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_join_request(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_club_join_policy(uuid, club_join_policy) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.join_or_request_club(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_club_join_policy(uuid, club_join_policy) TO service_role;
