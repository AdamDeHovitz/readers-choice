import "server-only";
import type { z } from "zod";
import * as auth from "@readers-choice/contract/auth";
import type { ActionResult, ErrorCode } from "@readers-choice/contract/result";
import { normalizeEmail } from "@readers-choice/core/credentials";
import { UserError } from "@readers-choice/core/user-error";
import { createAdminClient, type Db } from "@/server/db";
import { settle } from "@/server/errors";
import { verifyGoogleIdToken } from "@/server/google-id-token";
import * as sessions from "@/server/mobile-sessions";
import { verifyPassword } from "@/server/password";
import {
  consumeRateLimit,
  getClientIp,
  type RateLimitRule,
} from "@/server/rate-limit";
import { findAccountByEmail, upsertGoogleAccount } from "@/server/users";

/**
 * The mobile app's sign-in endpoints, POST /api/v1/auth/*. Each takes a JSON
 * body checked against its schema in packages/contract/auth.ts and returns
 * an ActionResult, with the HTTP status following the error code as for
 * operations. No cookies are read or set.
 */

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  invalid_input: 400,
  refused: 401,
  internal: 500,
  unavailable: 503,
  bad_request: 400,
  rate_limited: 429,
};

const reply = <T>(result: ActionResult<T>) =>
  Response.json(result, { status: result.success ? 200 : STATUS[result.code] });

const fail = (code: ErrorCode, error: string) =>
  reply({ success: false, error, code });

const TOO_MANY = "Too many attempts. Please try again later.";
const BAD_CREDENTIALS = "Incorrect email or password";

/** Thrown by an endpoint that hit a rate limit after reading its input. */
class RateLimited extends Error {}
const GOOGLE_REJECTED = "Google sign-in failed. Please try again.";

const rule = (scope: string, limit: number): RateLimitRule => ({
  scope,
  limit,
  windowSeconds: 15 * 60,
});

interface AuthEndpoint<S extends z.ZodType, T> {
  schema: S;
  /** Rate-limited per client IP before the body is read. */
  ipLimit: RateLimitRule;
  fallbackError: string;
  run(db: Db, input: z.output<S>): Promise<T>;
}

function endpoint<S extends z.ZodType, T>(def: AuthEndpoint<S, T>) {
  return async function POST(request: Request): Promise<Response> {
    const db = createAdminClient();
    if (
      !(await consumeRateLimit(db, def.ipLimit, getClientIp(request.headers)))
    ) {
      return fail("rate_limited", TOO_MANY);
    }
    if (
      !/^application\/json\b/i.test(request.headers.get("content-type") ?? "")
    ) {
      return fail("bad_request", "Send the input as application/json");
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("bad_request", "Request body is not valid JSON");
    }
    const parsed = def.schema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "invalid_input",
        parsed.error.issues[0]?.message ?? "Invalid input"
      );
    }

    try {
      return reply({ success: true, data: await def.run(db, parsed.data) });
    } catch (error) {
      if (error instanceof RateLimited) return fail("rate_limited", TOO_MANY);
      // UserError → refused with its message; anything else is logged.
      return reply(
        await settle(def.fallbackError, () => Promise.reject(error))
      );
    }
  };
}

export const passwordSignIn = endpoint({
  schema: auth.passwordSignIn,
  ipLimit: rule("mobile-signin:ip", 20),
  fallbackError: "Sign-in failed. Please try again.",
  async run(db, { email, password, deviceName }) {
    const normalized = normalizeEmail(email);
    const emailLimit = rule("mobile-signin:email", 10);
    if (!(await consumeRateLimit(db, emailLimit, normalized))) {
      throw new RateLimited();
    }
    const account = await findAccountByEmail(db, normalized);
    // Same message whether the account is missing, Google-only or the
    // password is wrong, so the endpoint doesn't reveal who has an account.
    if (!account?.passwordHash) throw new UserError(BAD_CREDENTIALS);
    if (!(await verifyPassword(password, account.passwordHash))) {
      throw new UserError(BAD_CREDENTIALS);
    }
    return sessions.startSession(
      db,
      { id: account.id, name: account.name, email: account.email },
      deviceName
    );
  },
});

export const googleSignIn = endpoint({
  schema: auth.googleSignIn,
  ipLimit: rule("mobile-google:ip", 30),
  fallbackError: GOOGLE_REJECTED,
  async run(db, { idToken, deviceName }) {
    const profile = await verifyGoogleIdToken(idToken);
    if (!profile) throw new UserError(GOOGLE_REJECTED);
    // The same account linking as the web's Google sign-in (auth.ts).
    await upsertGoogleAccount(db, profile);
    const account = await findAccountByEmail(db, profile.email);
    if (!account) throw new Error("Google account missing after upsert");
    return sessions.startSession(
      db,
      { id: account.id, name: account.name, email: account.email },
      deviceName
    );
  },
});

export const refresh = endpoint({
  schema: auth.refreshSession,
  ipLimit: rule("mobile-refresh:ip", 120),
  fallbackError: "Couldn't refresh your session. Please try again.",
  run: (db, { refreshToken }) => sessions.refreshSession(db, refreshToken),
});

export const signOut = endpoint({
  schema: auth.signOut,
  ipLimit: rule("mobile-signout:ip", 60),
  fallbackError: "Sign-out failed. Please try again.",
  run: (db, { refreshToken }) => sessions.endSession(db, refreshToken),
});
