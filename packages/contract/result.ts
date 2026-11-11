import type { InvalidationKey } from "./keys";

/**
 * Why a call failed, for clients to branch on. Messages are for people and
 * may change; codes are part of the contract and don't.
 *
 * - `unauthenticated`: no signed-in viewer. Sign in (mobile: refresh the token).
 * - `invalid_input`: the input failed the operation's schema.
 * - `refused`: the operation ran and said no (not a member, voting closed, …).
 * - `internal`: an unexpected server error. The message is generic.
 * - `unavailable`: the client couldn't reach the server. Try again.
 * - `bad_request`: the transport rejected the request itself (unknown
 *   operation, wrong origin or content type): a client bug.
 * - `rate_limited`: too many attempts (sign-in). Wait, then try again.
 *
 * Clients must treat an unknown code like `internal`: new codes may be added.
 */
export type ErrorCode =
  | "unauthenticated"
  | "invalid_input"
  | "refused"
  | "internal"
  | "unavailable"
  | "bad_request"
  | "rate_limited";

/** What every operation returns to a client, on the web and on mobile. */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode };

/** The JSON body of every /api/v1 response. */
export type OperationResponse<T = unknown> = ActionResult<T> & {
  /** Keys whose cached data is now stale (mobile: query keys to refetch). */
  invalidate: InvalidationKey[];
};
