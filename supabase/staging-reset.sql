-- Empty the STAGING database's public schema so a PR's migrations + seed can be
-- loaded from scratch (see .github/workflows/preview-db.yml).
--
-- STAGING ONLY. Never run against production: it drops every readers-choice
-- table. The staging project also hosts wedding-map, which lives in its own
-- `wedding_map` schema and is untouched by this script.

\set ON_ERROR_STOP on

BEGIN;

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Restore Supabase's stock public-schema grants. The migrations then lock it
-- down exactly as they did in production.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- Forget applied migrations and seed hashes so `supabase db push` replays both.
DROP SCHEMA IF EXISTS supabase_migrations CASCADE;

COMMIT;
