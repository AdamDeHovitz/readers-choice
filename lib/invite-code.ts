/**
 * Cheap shape check before hitting the database. Accepts both new codes
 * (server/invite-code.ts) and the older 8-character lowercase alphanumeric
 * codes.
 */
export function isWellFormedInviteCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(code);
}
