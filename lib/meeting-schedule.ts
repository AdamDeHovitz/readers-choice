/**
 * Pure rules for where a meeting is in its lifecycle. The single source of
 * truth for the server actions, pages and the club home page; the database
 * functions re-check the voting window atomically.
 *
 * Deadline instants are inclusive: a nomination or vote submitted exactly at
 * the deadline is still accepted.
 */

export interface MeetingSchedule {
  isFinalized: boolean | null;
  nominationDeadline: string | null;
  votingDeadline: string | null;
}

/**
 * - `nominating`: not finalized and the nomination deadline (if any) hasn't passed
 * - `voting`: nominations closed and the voting deadline (if any) hasn't passed
 * - `awaiting_finalization`: both deadlines passed but no book was picked yet
 * - `finalized`: a book was selected
 */
export type MeetingPhase =
  | "nominating"
  | "voting"
  | "awaiting_finalization"
  | "finalized";

function hasPassed(deadline: string | null, now: Date): boolean {
  return deadline !== null && now.getTime() > new Date(deadline).getTime();
}

export function isNominationClosed(
  meeting: Pick<MeetingSchedule, "isFinalized" | "nominationDeadline">,
  now: Date = new Date()
): boolean {
  return !!meeting.isFinalized || hasPassed(meeting.nominationDeadline, now);
}

export function isVotingClosed(
  meeting: Pick<MeetingSchedule, "isFinalized" | "votingDeadline">,
  now: Date = new Date()
): boolean {
  return !!meeting.isFinalized || hasPassed(meeting.votingDeadline, now);
}

export function getMeetingPhase(
  meeting: MeetingSchedule,
  now: Date = new Date()
): MeetingPhase {
  if (meeting.isFinalized) return "finalized";
  if (!isNominationClosed(meeting, now)) return "nominating";
  if (!isVotingClosed(meeting, now)) return "voting";
  return "awaiting_finalization";
}

/**
 * Which finalized meeting a club's home page features: the next upcoming one
 * if any ("Upcoming"), otherwise the most recent past one ("Previous Book").
 */
export function pickFeaturedMeeting<
  T extends { meetingDate: string; isFinalized: boolean | null },
>(
  meetings: readonly T[],
  now: Date = new Date()
): { meeting: T; label: "Upcoming" | "Previous Book" } | null {
  const time = (m: T) => new Date(m.meetingDate).getTime();
  const finalized = meetings.filter((m) => m.isFinalized);

  const upcoming = finalized
    .filter((m) => time(m) > now.getTime())
    .sort((a, b) => time(a) - time(b));
  if (upcoming.length > 0) return { meeting: upcoming[0], label: "Upcoming" };

  const past = [...finalized].sort((a, b) => time(b) - time(a));
  return past.length > 0 ? { meeting: past[0], label: "Previous Book" } : null;
}

/** The next not-yet-finalized meeting on or after `now`, if any. */
export function pickUpcomingMeeting<
  T extends { meetingDate: string; isFinalized: boolean | null },
>(meetings: readonly T[], now: Date = new Date()): T | null {
  const time = (m: T) => new Date(m.meetingDate).getTime();
  return (
    meetings
      .filter((m) => !m.isFinalized && time(m) >= now.getTime())
      .sort((a, b) => time(a) - time(b))[0] ?? null
  );
}
