-- OAuth 2.1 for the MCP server (/api/mcp). The site is its own authorization
-- server: AI apps (Claude, ChatGPT, …) register as clients, a signed-in user
-- approves one on a consent screen, and the client gets a short-lived access
-- token plus a rotating refresh token. Same storage rules as
-- mobile_sessions: only SHA-256 hashes of codes and refresh tokens are kept.
--
-- Purely additive: no existing tables or functions change, so this is safe to
-- apply before the code that uses it deploys.

-- Apps that may ask users for access. `registered` clients came through
-- Dynamic Client Registration (RFC 7591) and get a random id. `metadata_document`
-- clients are identified by the HTTPS URL of their Client ID Metadata
-- Document, which the server fetched and cached here.
CREATE TABLE public.oauth_clients (
  id text PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 512),
  kind text NOT NULL CHECK (kind IN ('registered', 'metadata_document')),
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 1 AND 100),
  redirect_uris text[] NOT NULL
    CHECK (cardinality(redirect_uris) BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- metadata_document clients: when the document was last fetched.
  metadata_fetched_at timestamptz,
  CHECK ((kind = 'metadata_document') = (metadata_fetched_at IS NOT NULL))
);

-- A user's standing permission for one client: the refresh-token session.
-- Rotation and replay detection work exactly as in mobile_sessions.
CREATE TABLE public.oauth_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id text NOT NULL REFERENCES public.oauth_clients(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope ~ '^[a-z:]+( [a-z:]+)*$'),
  -- The RFC 8707 resource (the MCP server URL) tokens are issued for.
  resource text NOT NULL CHECK (char_length(resource) <= 512),
  -- Where the approval was sent; Settings shows its host for the connection.
  redirect_uri text NOT NULL CHECK (char_length(redirect_uri) <= 2048),
  refresh_token_hash text NOT NULL UNIQUE CHECK (refresh_token_hash ~ '^[0-9a-f]{64}$'),
  previous_token_hash text UNIQUE CHECK (previous_token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_oauth_grants_user_id ON public.oauth_grants(user_id);
CREATE INDEX idx_oauth_grants_client_id ON public.oauth_grants(client_id);

-- Single-use authorization codes, valid for minutes. A code presented twice
-- revokes the grant it was exchanged for (grant_id).
CREATE TABLE public.oauth_authorization_codes (
  code_hash text PRIMARY KEY CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  client_id text NOT NULL REFERENCES public.oauth_clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL CHECK (char_length(redirect_uri) <= 2048),
  -- PKCE S256 challenge: base64url SHA-256, always 43 characters.
  code_challenge text NOT NULL CHECK (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  scope text NOT NULL CHECK (scope ~ '^[a-z:]+( [a-z:]+)*$'),
  resource text NOT NULL CHECK (char_length(resource) <= 512),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  grant_id uuid REFERENCES public.oauth_grants(id) ON DELETE SET NULL
);

CREATE INDEX idx_oauth_authorization_codes_expires_at
  ON public.oauth_authorization_codes(expires_at);

-- Same model as every other table: RLS on, no policies, service role only.
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oauth_clients FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.oauth_grants FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.oauth_authorization_codes FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.oauth_clients TO service_role;
GRANT ALL ON public.oauth_grants TO service_role;
GRANT ALL ON public.oauth_authorization_codes TO service_role;
