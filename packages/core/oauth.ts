/**
 * Pure OAuth 2.1 rules for the MCP authorization server
 * (apps/web/server/oauth/): scopes, redirect URIs and PKCE input formats.
 */

/**
 * What a client may do. Every grant carries `read`, so a token can always
 * list and read. `write` lets it make changes as the user, but as if they
 * were an ordinary member; `admin` (only with `write`) adds their club-admin
 * and super-admin powers.
 */
export const OAUTH_SCOPES = ["read", "write", "admin"] as const;
export type OAuthScope = (typeof OAUTH_SCOPES)[number];

export const SCOPE_DESCRIPTIONS: Record<OAuthScope, string> = {
  read: "See your clubs, members, themes and join requests",
  write:
    "Act as you: join and leave clubs, ask to join, and suggest and vote on themes",
  admin:
    "Use your admin powers: approve and remove members, make admins, change who can join, and manage invites",
};

/**
 * Keep the scopes the user allowed on the consent screen: `admin` means
 * nothing without `write`, so it goes too.
 */
export function chosenScopes(
  requested: readonly OAuthScope[],
  allowed: { write: boolean; admin: boolean }
): OAuthScope[] {
  const write = allowed.write && requested.includes("write");
  const admin = write && allowed.admin && requested.includes("admin");
  return requested.filter(
    (scope) =>
      scope === "read" ||
      (scope === "write" && write) ||
      (scope === "admin" && admin)
  );
}

/**
 * The scopes to grant for a requested `scope` string: the known ones, plus
 * `read`. Unknown scopes are dropped (RFC 6749 §3.3 lets the server grant
 * less than asked); no scope at all means everything, as MCP clients that
 * find no scope in the challenge ask for nothing.
 */
export function grantableScopes(requested: string | null): OAuthScope[] {
  if (requested === null || requested.trim() === "") return [...OAUTH_SCOPES];
  const asked = new Set(requested.split(" ").filter(Boolean));
  return OAUTH_SCOPES.filter((scope) => scope === "read" || asked.has(scope));
}

/** A scope string as stored and sent: known scopes, in canonical order. */
export function formatScope(scopes: readonly string[]): string {
  return OAUTH_SCOPES.filter((scope) => scopes.includes(scope)).join(" ");
}

export function parseScope(scope: string): OAuthScope[] {
  const parts = scope.split(" ");
  return OAUTH_SCOPES.filter((known) => parts.includes(known));
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** A loopback redirect: a native app listening on this device. */
export function isLoopbackRedirect(uri: URL): boolean {
  return uri.protocol === "http:" && LOOPBACK_HOSTS.has(uri.hostname);
}

/**
 * Whether a client may register this redirect URI. MCP requires HTTPS or a
 * loopback address (http://localhost, 127.0.0.1 or [::1]). Fragments and
 * credentials are never allowed (RFC 6749 §3.1.2, OAuth 2.1 §7.5).
 */
export function isAllowedRedirectUri(value: string): boolean {
  if (value.length > 2048) return false;
  let uri: URL;
  try {
    uri = new URL(value);
  } catch {
    return false;
  }
  if (uri.hash !== "" || value.includes("#")) return false;
  if (uri.username !== "" || uri.password !== "") return false;
  if (uri.protocol === "https:") return uri.hostname !== "";
  return isLoopbackRedirect(uri);
}

/**
 * Whether a redirect URI in an authorization request matches a registered
 * one: an exact string match, except that a loopback redirect may use any
 * port, since native apps pick a free port at run time (RFC 8252 §7.3).
 */
export function redirectUriMatches(
  registered: string,
  requested: string
): boolean {
  if (registered === requested) return true;
  let a: URL;
  let b: URL;
  try {
    a = new URL(registered);
    b = new URL(requested);
  } catch {
    return false;
  }
  if (!isLoopbackRedirect(a) || !isLoopbackRedirect(b)) return false;
  if (!isAllowedRedirectUri(requested)) return false;
  return (
    a.hostname === b.hostname &&
    a.pathname === b.pathname &&
    a.search === b.search
  );
}

/** A PKCE S256 code challenge: base64url SHA-256, 43 characters. */
export const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** A PKCE code verifier (RFC 7636 §4.1). */
export const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;
