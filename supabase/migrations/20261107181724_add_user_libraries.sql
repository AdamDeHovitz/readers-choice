-- Libraries a user belongs to, for showing ebook/audiobook availability while
-- voting. `library_key` is the library's OverDrive (Libby) fulfillment id,
-- e.g. 'nypl' or 'losangeles'. The server action verifies each key against
-- OverDrive and stores the name OverDrive reports, so any OverDrive library
-- works without a curated list.
--
-- Purely additive: no existing tables or functions change, so this is safe to
-- apply before the code that uses it deploys.

CREATE TABLE public.user_libraries (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  library_key text NOT NULL CHECK (library_key ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  position smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, library_key)
);

-- Same model as every other table: RLS on, no policies, service role only.
ALTER TABLE public.user_libraries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_libraries FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.user_libraries TO service_role;

-- Replaces a user's libraries in one transaction.
-- p_libraries: [{"key": "nypl", "name": "New York Public Library"}, ...] in
-- display order. An empty array clears them.
CREATE OR REPLACE FUNCTION public.set_user_libraries(
  p_user_id uuid,
  p_libraries jsonb
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF jsonb_typeof(p_libraries) <> 'array' THEN
    RAISE EXCEPTION 'invalid_libraries';
  END IF;
  IF jsonb_array_length(p_libraries) > 5 THEN
    RAISE EXCEPTION 'too_many_libraries';
  END IF;

  DELETE FROM user_libraries WHERE user_id = p_user_id;

  INSERT INTO user_libraries (user_id, library_key, name, position)
  SELECT p_user_id, item->>'key', item->>'name', (ordinality - 1)::smallint
    FROM jsonb_array_elements(p_libraries) WITH ORDINALITY AS t(item, ordinality);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_libraries(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_libraries(uuid, jsonb) TO service_role;
