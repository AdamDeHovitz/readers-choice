import "server-only";
import { createHash, randomBytes } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import type { Session } from "@readers-choice/contract/auth";
import { UserError } from "@readers-choice/core/user-error";
import type { Db } from "./db";

/**
 * Mobile app sessions (#75): a short-lived signed access token, and a
 * refresh token whose SHA-256 hash is stored in `mobile_sessions`.
 *
 * - Refreshing replaces the refresh token (rotation) and keeps the session
 *   alive; a session expires after `IDLE_DAYS` without a refresh.
 * - Presenting a replaced token after `REUSE_GRACE_SECONDS` means it leaked
 *   or was replayed, so the session is revoked. Within the grace period it's
 *   the app's own concurrent refresh, which is refused without revoking.
 * - Access tokens aren't checked against the table, so revoking a session
 *   takes effect when its current access token expires.
 */

const ACCESS_TOKEN_SECONDS = 15 * 60;
export const IDLE_DAYS = 90;
const REUSE_GRACE_SECONDS = 60;
const ISSUER = "readers-choice";
const AUDIENCE = "readers-choice-mobile";

const SIGNED_OUT = "Your session has ended. Please sign in again.";
const JUST_REFRESHED =
  "This session was just refreshed. Use the newest refresh token.";

function signingKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

async function signAccessToken(
  user: SessionUser,
  sessionId: string,
  now: Date
): Promise<{ token: string; expiresAt: Date }> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = new Date((issuedAt + ACCESS_TOKEN_SECONDS) * 1000);
  const token = await new SignJWT({ name: user.name, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(signingKey());
  return { token, expiresAt };
}

async function sessionFor(
  user: SessionUser,
  sessionId: string,
  refreshToken: string,
  now: Date
): Promise<Session> {
  const access = await signAccessToken(user, sessionId, now);
  return {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken,
    user,
  };
}

/** Start a session for a user who just proved who they are. */
export async function startSession(
  db: Db,
  user: SessionUser,
  deviceName: string | undefined,
  now = new Date()
): Promise<Session> {
  const refreshToken = newRefreshToken();
  const { data, error } = await db
    .from("mobile_sessions")
    .insert({
      user_id: user.id,
      refresh_token_hash: hashToken(refreshToken),
      device_name: deviceName || null,
      created_at: now.toISOString(),
      last_used_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return sessionFor(user, data.id, refreshToken, now);
}

/** Swap a refresh token for a new session; throws a UserError if it's dead. */
export async function refreshSession(
  db: Db,
  refreshToken: string,
  now = new Date()
): Promise<Session> {
  const presented = hashToken(refreshToken);
  const idleCutoff = new Date(now.getTime() - IDLE_DAYS * 86_400_000);
  const replacement = newRefreshToken();

  // Compare-and-swap, so two refreshes with one token can't both succeed.
  const { data: rotated, error } = await db
    .from("mobile_sessions")
    .update({
      refresh_token_hash: hashToken(replacement),
      previous_token_hash: presented,
      last_used_at: now.toISOString(),
      rotated_at: now.toISOString(),
    })
    .eq("refresh_token_hash", presented)
    .is("revoked_at", null)
    .gt("last_used_at", idleCutoff.toISOString())
    .select("id, users!inner (id, name, email)")
    .maybeSingle();
  if (error) throw error;
  if (rotated) {
    return sessionFor(rotated.users, rotated.id, replacement, now);
  }

  const { data: replayed, error: replayError } = await db
    .from("mobile_sessions")
    .select("id, rotated_at, revoked_at")
    .eq("previous_token_hash", presented)
    .maybeSingle();
  if (replayError) throw replayError;
  if (replayed && !replayed.revoked_at) {
    const rotatedAt = replayed.rotated_at ? Date.parse(replayed.rotated_at) : 0;
    if (now.getTime() - rotatedAt <= REUSE_GRACE_SECONDS * 1000) {
      // The app's own concurrent refresh won; it should use the newer token.
      throw new UserError(JUST_REFRESHED);
    }
    await revokeSessionById(db, replayed.id, now);
  }
  throw new UserError(SIGNED_OUT);
}

async function revokeSessionById(db: Db, id: string, now: Date) {
  const { error } = await db
    .from("mobile_sessions")
    .update({ revoked_at: now.toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Sign a device out. Unknown tokens are ignored, so it's idempotent. */
export async function endSession(
  db: Db,
  refreshToken: string,
  now = new Date()
): Promise<void> {
  const { error } = await db
    .from("mobile_sessions")
    .update({ revoked_at: now.toISOString() })
    .eq("refresh_token_hash", hashToken(refreshToken))
    .is("revoked_at", null);
  if (error) throw error;
}

export interface AccessTokenClaims {
  userId: string;
  name: string;
  sessionId: string;
}

/** The claims of a valid, unexpired access token, or null. */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return { userId: payload.sub, name: payload.name, sessionId: payload.sid };
  } catch {
    return null;
  }
}
