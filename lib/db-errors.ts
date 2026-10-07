/**
 * Translate the stable error codes raised by our database functions (see
 * supabase/migrations/*_atomic_voting_and_membership.sql) into user-facing
 * messages. Returns null for anything unrecognized so callers can fall back
 * to a generic message without leaking internals.
 */

const MESSAGES: Record<string, string> = {
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

export function dbErrorMessage(
  error: { message?: string } | null | undefined
): string | null {
  if (!error?.message) return null;
  return MESSAGES[error.message] ?? null;
}
