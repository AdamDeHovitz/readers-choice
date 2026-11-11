// Credential rules shared by every client. Hashing is server-only:
// server/password.ts.

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt silently ignores everything past 72 bytes
export const MAX_PASSWORD_BYTES = 72;

/**
 * Emails are stored and looked up lowercased (enforced by a unique index on
 * lower(email)), so "Foo@x.com" and "foo@x.com" are the same account.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
