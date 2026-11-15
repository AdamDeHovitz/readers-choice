import "server-only";
import type { Db } from "../db";
import { hashToken, newOpaqueToken } from "../tokens";
import { GRANT_IDLE_DAYS, GRANT_MAX_DAYS } from "./config";
import { OAuthTokenError } from "./errors";

/**
 * Grants: a user's standing permission for one OAuth client, carried by a
 * rotating refresh token. Rotation follows mobile-sessions.ts (a refresh
 * replaces the token by compare-and-swap), but any replay of a replaced
 * token revokes the grant. A grant ends after GRANT_IDLE_DAYS unused, or
 * GRANT_MAX_DAYS after the user approved it, whichever comes first.
 */

export interface Grant {
  id: string;
  userId: string;
  clientId: string;
  scope: string;
  resource: string;
  /** The redirect URI the user's approval was sent to. */
  redirectUri: string;
}

const daysBefore = (now: Date, days: number) =>
  new Date(now.getTime() - days * 86_400_000).toISOString();

export async function createGrant(
  db: Db,
  grant: Omit<Grant, "id">,
  now = new Date()
): Promise<{ grant: Grant; refreshToken: string }> {
  const refreshToken = newOpaqueToken();
  const { data, error } = await db
    .from("oauth_grants")
    .insert({
      user_id: grant.userId,
      client_id: grant.clientId,
      scope: grant.scope,
      resource: grant.resource,
      redirect_uri: grant.redirectUri,
      refresh_token_hash: hashToken(refreshToken),
      created_at: now.toISOString(),
      last_used_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return { grant: { ...grant, id: data.id }, refreshToken };
}

const GRANT_COLUMNS = "id, user_id, client_id, scope, resource, redirect_uri";

type GrantRow = {
  id: string;
  user_id: string;
  client_id: string;
  scope: string;
  resource: string;
  redirect_uri: string;
};

const toGrant = (row: GrantRow): Grant => ({
  id: row.id,
  userId: row.user_id,
  clientId: row.client_id,
  scope: row.scope,
  resource: row.resource,
  redirectUri: row.redirect_uri,
});

/**
 * Swap a refresh token for a new one. The token must belong to `clientId`
 * and have been issued for `resource` (this deployment's MCP server);
 * anything else is invalid_grant, as RFC 6749 §5.2 asks.
 */
export async function rotateGrant(
  db: Db,
  refreshToken: string,
  clientId: string,
  resource: string,
  now = new Date()
): Promise<{ grant: Grant; refreshToken: string }> {
  const presented = hashToken(refreshToken);
  const replacement = newOpaqueToken();

  const { data: rotated, error } = await db
    .from("oauth_grants")
    .update({
      refresh_token_hash: hashToken(replacement),
      previous_token_hash: presented,
      last_used_at: now.toISOString(),
      rotated_at: now.toISOString(),
    })
    .eq("refresh_token_hash", presented)
    .eq("client_id", clientId)
    .eq("resource", resource)
    .is("revoked_at", null)
    .gt("last_used_at", daysBefore(now, GRANT_IDLE_DAYS))
    .gt("created_at", daysBefore(now, GRANT_MAX_DAYS))
    .select(GRANT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (rotated) return { grant: toGrant(rotated), refreshToken: replacement };

  const { data: replayed, error: replayError } = await db
    .from("oauth_grants")
    .select("id, revoked_at")
    .eq("previous_token_hash", presented)
    .maybeSingle();
  if (replayError) throw replayError;
  // Unlike mobile sessions there's no grace period: whichever of a thief and
  // the real client refreshes second would otherwise be refused while the
  // first kept the grant. Revoking means both have to start over, and the
  // user sees the app disconnected.
  if (replayed && !replayed.revoked_at) {
    await revokeGrantById(db, replayed.id, now);
  }
  throw new OAuthTokenError("invalid_grant", "The refresh token is not valid");
}

export async function revokeGrantById(
  db: Db,
  id: string,
  now = new Date()
): Promise<void> {
  const { error } = await db
    .from("oauth_grants")
    .update({ revoked_at: now.toISOString() })
    .eq("id", id)
    .is("revoked_at", null);
  if (error) throw error;
}

/**
 * The live grant an access token names, with its user's name, or null if
 * it was revoked, expired, or belongs to someone else.
 */
export async function findLiveGrant(
  db: Db,
  claims: { grantId: string; userId: string; clientId: string },
  now = new Date()
): Promise<{ grant: Grant; userName: string } | null> {
  const { data, error } = await db
    .from("oauth_grants")
    .select(`${GRANT_COLUMNS}, users!inner (name)`)
    .eq("id", claims.grantId)
    .eq("user_id", claims.userId)
    .eq("client_id", claims.clientId)
    .is("revoked_at", null)
    .gt("last_used_at", daysBefore(now, GRANT_IDLE_DAYS))
    .gt("created_at", daysBefore(now, GRANT_MAX_DAYS))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { grant: toGrant(data), userName: data.users.name };
}

export interface ConnectedApp {
  grantId: string;
  clientName: string;
  /** Where the user's approval was sent, so look-alike apps stand out. */
  clientHost: string | null;
  scope: string;
  connectedAt: string;
  lastUsedAt: string;
}

/** The viewer's live connections, most recently used first. */
export async function listConnectedApps(
  db: Db,
  userId: string,
  now = new Date()
): Promise<ConnectedApp[]> {
  const { data, error } = await db
    .from("oauth_grants")
    .select(
      "id, scope, redirect_uri, created_at, last_used_at, oauth_clients!inner (client_name)"
    )
    .eq("user_id", userId)
    .is("revoked_at", null)
    .gt("last_used_at", daysBefore(now, GRANT_IDLE_DAYS))
    .gt("created_at", daysBefore(now, GRANT_MAX_DAYS))
    .order("last_used_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    grantId: row.id,
    clientName: row.oauth_clients.client_name,
    clientHost: hostOf(row.redirect_uri),
    scope: row.scope,
    connectedAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }));
}

function hostOf(uri: string): string | null {
  try {
    return new URL(uri).host;
  } catch {
    return null;
  }
}

/** Revoke one of the user's grants. Unknown or foreign ids do nothing. */
export async function revokeUserGrant(
  db: Db,
  userId: string,
  grantId: string,
  now = new Date()
): Promise<boolean> {
  const { data, error } = await db
    .from("oauth_grants")
    .update({ revoked_at: now.toISOString() })
    .eq("id", grantId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id");
  if (error) throw error;
  return data.length > 0;
}
