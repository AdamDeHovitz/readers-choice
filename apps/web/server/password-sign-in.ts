import "server-only";
import { normalizeEmail } from "@readers-choice/core/credentials";
import type { Db } from "./db";
import { verifyPassword } from "./password";
import { consumeRateLimit, type RateLimitRule } from "./rate-limit";
import { findAccountByEmail, type Account } from "./users";

/**
 * Email-and-password sign-in, shared by the web (NextAuth credentials) and
 * the mobile app (/api/v1/auth/password), so both have the same limits:
 *
 * - Attempts per email are limited across both, so guessing one account's
 *   password can't switch clients to get more tries. Callers also limit per
 *   IP.
 * - A missing or Google-only account still costs one bcrypt comparison, so
 *   response time doesn't reveal which emails have accounts.
 */

export const SIGN_IN_EMAIL_LIMIT: RateLimitRule = {
  scope: "signin:email",
  limit: 10,
  windowSeconds: 15 * 60,
};

/** A bcrypt hash (cost 12) of a random password nobody knows. */
const DUMMY_HASH =
  "$2b$12$SiUGw.bxufK3W/WvGN9/SO4w62KXDQYaZ9YuuKa92X4JLfN9E4WqG";

export type PasswordSignIn =
  | { kind: "ok"; account: Account }
  | { kind: "rate_limited" }
  | { kind: "bad_credentials" };

export async function checkPasswordSignIn(
  db: Db,
  email: string,
  password: string
): Promise<PasswordSignIn> {
  const normalized = normalizeEmail(email);
  if (!(await consumeRateLimit(db, SIGN_IN_EMAIL_LIMIT, normalized))) {
    return { kind: "rate_limited" };
  }
  const account = await findAccountByEmail(db, normalized);
  const matches = await verifyPassword(
    password,
    account?.passwordHash ?? DUMMY_HASH
  );
  return account?.passwordHash && matches
    ? { kind: "ok", account }
    : { kind: "bad_credentials" };
}
