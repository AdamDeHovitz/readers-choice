/**
 * How people join a club. Mirrors the `club_join_policy` enum in the
 * database (supabase/migrations/*_add_club_join_policy_and_requests.sql).
 *
 * - `invite_only`: only through an invite link, and the club is unlisted.
 * - `request`: listed; anyone can ask, and an admin approves.
 * - `open`: listed; anyone can join straight away.
 *
 * An invite link admits its holder whatever the policy.
 */
export const JOIN_POLICIES = ["invite_only", "request", "open"] as const;
export type JoinPolicy = (typeof JOIN_POLICIES)[number];

/** Whether people outside the club can find it in Browse. */
export function isListed(policy: JoinPolicy): boolean {
  return policy !== "invite_only";
}

/**
 * How long someone waits to ask again after an admin declines. The database
 * function `join_or_request_club` enforces it; this copy dates the message.
 */
export const JOIN_REQUEST_COOLDOWN_DAYS = 30;

/** When a declined requester may ask again. */
export function canRequestAgainAt(declinedAt: Date): Date {
  return new Date(
    declinedAt.getTime() + JOIN_REQUEST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );
}

/** Longest note a requester can send with a request (matches the column check). */
export const JOIN_REQUEST_MESSAGE_MAX = 500;
