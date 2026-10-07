import { randomBytes } from "crypto";

/** Bytes of entropy in a newly generated invite code (128 bits). */
export const INVITE_CODE_BYTES = 16;

/**
 * Generate an unguessable, URL-safe invite code (22 base64url characters).
 */
export function generateInviteCode(): string {
  return randomBytes(INVITE_CODE_BYTES).toString("base64url");
}

/**
 * Cheap shape check before hitting the database. Accepts both new codes and
 * the older 8-character lowercase alphanumeric codes.
 */
export function isWellFormedInviteCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(code);
}
