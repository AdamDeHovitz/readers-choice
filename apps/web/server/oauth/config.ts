import "server-only";

/**
 * The MCP server's OAuth layout. The site is both the authorization server
 * (issuer = the site's origin) and the protected resource (the MCP
 * endpoint). Everything is derived from the origin the request came in on,
 * so each deployment (production, previews, localhost) issues tokens only
 * for itself: a token's audience is that deployment's MCP URL.
 */

export const MCP_PATH = "/api/mcp";

/** How long an authorization code stays redeemable. */
export const CODE_TTL_SECONDS = 5 * 60;
/**
 * Access tokens are checked against their grant on every request (so a
 * revoked connection stops at once), which allows a longer lifetime than
 * the mobile app's unchecked 15-minute tokens.
 */
export const ACCESS_TOKEN_SECONDS = 60 * 60;
/** A connection ends after this long without a token refresh. */
export const GRANT_IDLE_DAYS = 90;
/** …and this long after the user approved it, however much it's used. */
export const GRANT_MAX_DAYS = 365;

export interface OAuthUrls {
  /** The authorization server's issuer identifier (RFC 8414). */
  issuer: string;
  /** The MCP server's canonical URI: the RFC 8707 resource and token audience. */
  resource: string;
  resourceMetadata: string;
  authorization: string;
  token: string;
  registration: string;
}

export function oauthUrls(origin: string): OAuthUrls {
  return {
    issuer: origin,
    resource: `${origin}${MCP_PATH}`,
    resourceMetadata: `${origin}/.well-known/oauth-protected-resource${MCP_PATH}`,
    authorization: `${origin}/oauth/authorize`,
    token: `${origin}/api/oauth/token`,
    registration: `${origin}/api/oauth/register`,
  };
}

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$|^\[[0-9a-f:]+\](:\d{1,5})?$/i;

/**
 * This site's origin, from the request's Host: the domain the platform
 * routed the request by, so a client can't name another site there.
 * X-Forwarded-Host is ignored on purpose, since a client can set it to
 * anything. Loopback hosts are http; everything else is https.
 */
export function siteOrigin(headers: Headers): string {
  const host = headers.get("host");
  if (!host || !HOST.test(host)) throw new Error("Request has no valid Host");
  const hostname = host.replace(/:\d+$/, "").toLowerCase();
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  return `${loopback ? "http" : "https"}://${host.toLowerCase()}`;
}
