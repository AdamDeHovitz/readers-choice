import "server-only";
import type { ActionResult } from "@/contract/result";
import { UserError } from "@/lib/user-error";

/**
 * Stable error codes raised by our database functions (see
 * supabase/migrations/*_atomic_voting_and_membership.sql).
 */
const DB_ERROR_MESSAGES: Record<string, string> = {
  meeting_not_found: "Meeting not found",
  book_option_not_found: "Book option not found",
  book_club_not_found: "Book club not found",
  voting_closed: "Voting has closed",
  not_member: "You are not a member of this book club",
  invalid_ballot: "Invalid ballot",
  invalid_voting_method: "Invalid voting method",
  invalid_rankings: "Invalid rankings",
  last_admin: "Cannot remove the last admin",
};

/**
 * Throw if a Supabase call failed: known database error codes become an
 * UserError with a user-facing message; anything else is rethrown as-is
 * (and so reported to the user only generically).
 */
export function throwIfDbError(
  error: { message?: string } | null | undefined
): void {
  if (!error) return;
  const message = error.message && DB_ERROR_MESSAGES[error.message];
  if (message) throw new UserError(message);
  throw error;
}

export const UNAUTHORIZED = "Unauthorized";

/**
 * Run `body` and turn its outcome into an ActionResult.
 *
 * - `UserError`: fails with its (user-facing) message.
 * - Anything else: logged, and fails with `fallbackError` so database or
 *   network internals never reach the client.
 */
export async function settle<T>(
  fallbackError: string,
  body: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await body() };
  } catch (error) {
    if (error instanceof UserError) {
      return { success: false, error: error.message };
    }
    console.error(`${fallbackError}:`, error);
    return { success: false, error: fallbackError };
  }
}
