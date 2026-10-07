-- Make google_id nullable for credentials users
ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;
DROP INDEX IF EXISTS idx_users_google_id;
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Add password hash column
ALTER TABLE users ADD COLUMN password_hash TEXT;
