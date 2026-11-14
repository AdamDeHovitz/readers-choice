import "server-only";
import { parseScope, type OAuthScope } from "@readers-choice/core/oauth";
import { createAdminClient } from "../db";
import type { Viewer } from "../viewer";
import { verifyAccessToken } from "./access-tokens";
import type { OAuthUrls } from "./config";
import { findLiveGrant } from "./grants";

/** Who an MCP request acts for, once its access token checks out. */
export interface McpCaller {
  viewer: Viewer;
  clientId: string;
  scopes: OAuthScope[];
  expiresAt: number;
}

/**
 * Check an MCP access token: signature, issuer, audience (this deployment's
 * MCP URL) and expiry, then that its grant is still live, so revoking a
 * connection in Settings takes effect on the next request. Null when any
 * check fails.
 */
export async function authenticateMcpToken(
  token: string,
  urls: OAuthUrls,
  now = new Date()
): Promise<McpCaller | null> {
  const claims = await verifyAccessToken(token, urls);
  if (!claims) return null;
  const db = createAdminClient();
  const live = await findLiveGrant(db, claims, now);
  if (!live || live.grant.resource !== urls.resource) return null;

  // The token may carry less than the grant (a narrowed refresh), never more.
  const granted = parseScope(live.grant.scope);
  const scopes = parseScope(claims.scope).filter((s) => granted.includes(s));
  return {
    viewer: { userId: claims.userId, name: live.userName, db },
    clientId: claims.clientId,
    scopes,
    expiresAt: claims.expiresAt,
  };
}
