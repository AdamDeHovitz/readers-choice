-- Lock down the users table.
--
-- The app only reaches the database through server code using the service-role
-- key, and NextAuth never sets auth.uid(), so the anon/authenticated roles have
-- no legitimate use for this table. Before this migration, anyone holding the
-- public anon key could read every email + password_hash and insert arbitrary
-- user rows via PostgREST.

DROP POLICY IF EXISTS "Users can read all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can create a user account" ON users;

REVOKE ALL ON users FROM anon, authenticated;

-- Emails are compared case-insensitively by the app (lowercased on write and
-- lookup). Normalize existing rows and enforce uniqueness on the lowered value.
-- This fails loudly if two rows differ only by case; merge them by hand first.
UPDATE users SET email = lower(email) WHERE email <> lower(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
