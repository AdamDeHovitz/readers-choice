-- Sign-in sessions for the mobile app (#75). The web keeps its NextAuth
-- cookie; the app gets a short-lived signed access token plus a refresh
-- token. Only a SHA-256 hash of each refresh token is stored.
--
-- Each refresh replaces the token (rotation). The previous hash is kept so a
-- replayed old token can be detected and the session revoked. A session
-- expires after 90 days without a refresh (the app checks last_used_at).
--
-- Purely additive: no existing tables or functions change, so this is safe to
-- apply before the code that uses it deploys.

CREATE TABLE public.mobile_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE CHECK (refresh_token_hash ~ '^[0-9a-f]{64}$'),
  previous_token_hash text UNIQUE CHECK (previous_token_hash ~ '^[0-9a-f]{64}$'),
  device_name text CHECK (char_length(device_name) <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_mobile_sessions_user_id ON public.mobile_sessions(user_id);

-- Same model as every other table: RLS on, no policies, service role only.
ALTER TABLE public.mobile_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_sessions FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.mobile_sessions TO service_role;
