import "server-only";
import { createHash, hkdfSync, randomBytes } from "crypto";

/**
 * Helpers for the secrets this server hands out (mobile refresh tokens,
 * OAuth codes and refresh tokens). Only their hashes are stored, so a
 * database leak doesn't leak working tokens.
 */

/** A new random secret: 256 bits, base64url. */
export function newOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The hash a token is stored and looked up by. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A signing key derived from AUTH_SECRET for one purpose, so tokens of one
 * kind can never verify as another and the raw secret NextAuth uses isn't
 * reused directly.
 */
export function derivedKey(purpose: string): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new Uint8Array(
    hkdfSync("sha256", secret, "readers-choice", purpose, 32)
  );
}
