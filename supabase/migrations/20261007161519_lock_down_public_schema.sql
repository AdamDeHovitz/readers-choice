-- Lock down every object in the public schema from the anon/authenticated roles.
--
-- The app reaches the database only from server code using the service-role key
-- (which bypasses RLS), and NextAuth never sets auth.uid(). The anon and
-- authenticated roles therefore have no legitimate use for anything in public.
-- This extends 20261007151257_lock_down_users_table to the rest of the schema.

-- 1. Drop the RLS policies. They are all written against auth.uid(), which is
--    never set, so they only ever granted (or appeared to grant) access to the
--    unused roles. RLS stays enabled, so with no policies every non-bypass role
--    is denied by default.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END
$$;

-- 2. Views run with the caller's privileges rather than the owner's, so they can
--    never be used to read around table permissions.
ALTER VIEW public.view_vote_counts SET (security_invoker = true);
ALTER VIEW public.view_theme_vote_counts SET (security_invoker = true);

-- 3. Revoke everything that already exists.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, PUBLIC;

-- The service role keeps full access (it already has it; restated for clarity).
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 4. Stop future objects created by migrations (owned by postgres) from being
--    granted to anon/authenticated automatically. Objects created by
--    supabase_admin are outside our control; migrations here never run as it.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
