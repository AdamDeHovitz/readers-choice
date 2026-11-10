-- Create a book club and make its creator the first admin in one transaction.
-- Previously the app inserted the club and then the membership separately, so
-- a failure in between left a club with no members (and no admin to fix it).
--
-- Purely additive: a new function, so it is safe to apply before the code that
-- uses it deploys. The creator ID comes from the authenticated server session;
-- only service_role can invoke this function.
CREATE FUNCTION public.create_book_club(
  p_name TEXT,
  p_creator_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_book_club_id UUID;
BEGIN
  INSERT INTO book_clubs (name, description, created_by)
  VALUES (p_name, p_description, p_creator_id)
  RETURNING id INTO v_book_club_id;

  INSERT INTO members (book_club_id, user_id, is_admin)
  VALUES (v_book_club_id, p_creator_id, true);

  RETURN v_book_club_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_book_club(TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_book_club(TEXT, UUID, TEXT)
  TO service_role;
