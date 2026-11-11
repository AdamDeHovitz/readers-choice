import "server-only";
import { randomBytes } from "crypto";

/** Bytes of entropy in a newly generated invite code (128 bits). */
export const INVITE_CODE_BYTES = 16;

/**
 * Generate an unguessable, URL-safe invite code (22 base64url characters).
 */
export function generateInviteCode(): string {
  return randomBytes(INVITE_CODE_BYTES).toString("base64url");
}
