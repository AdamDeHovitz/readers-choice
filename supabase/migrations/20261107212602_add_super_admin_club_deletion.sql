-- Global super admins, who can delete any book club (e.g. spam) from /browse.
-- Purely additive: a new column defaulting to false and a new function, so it
-- is safe to apply before the code that uses it deploys.
--
-- Roles are assigned manually in Supabase, never through an app endpoint.
ALTER TABLE public.users
  ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- The caller ID comes from the authenticated server session. Only service_role
-- can invoke this function; browser clients cannot impersonate another user.
CREATE FUNCTION public.delete_book_club(
  p_book_club_id UUID,
  p_actor_id UUID,
  p_confirmation_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_club_name TEXT;
BEGIN
  -- Hold the role row until deletion commits so revocation cannot race it.
  SELECT is_super_admin INTO v_is_super_admin
  FROM public.users WHERE id = p_actor_id FOR SHARE;

  IF v_is_super_admin IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Only super admins can delete book clubs';
  END IF;

  SELECT name INTO v_club_name
  FROM public.book_clubs WHERE id = p_book_club_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book club not found';
  END IF;

  IF p_confirmation_name IS DISTINCT FROM v_club_name THEN
    RAISE EXCEPTION 'Type the book club name exactly to confirm deletion';
  END IF;

  -- Existing foreign keys cascade to all club-owned records atomically.
  -- User accounts and shared book records are retained.
  DELETE FROM public.book_clubs WHERE id = p_book_club_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_book_club(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_book_club(UUID, UUID, TEXT)
  TO service_role;
