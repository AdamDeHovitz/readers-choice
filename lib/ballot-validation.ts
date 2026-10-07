/**
 * Pure validation for ballots and personal rankings.
 *
 * Server actions run these before writing so callers get a precise error
 * message; the database functions re-check the structural rules atomically.
 */

export type ValidationResult = { ok: true } | { ok: false; error: string };

const valid: ValidationResult = { ok: true };
const invalid = (error: string): ValidationResult => ({ ok: false, error });

/**
 * True when `ranks` is exactly 1..N (in any order) with no duplicates.
 * An empty list is a valid (empty) ranking.
 */
export function isContiguousRanking(ranks: readonly number[]): boolean {
  const seen = new Set<number>();
  for (const rank of ranks) {
    if (!Number.isInteger(rank) || rank < 1 || rank > ranks.length) {
      return false;
    }
    if (seen.has(rank)) return false;
    seen.add(rank);
  }
  return true;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * Validate a ranked-choice ballot for a meeting.
 *
 * @param rankings - The submitted ballot
 * @param meetingOptionIds - IDs of the book options belonging to the meeting
 */
export function validateRankedBallot(
  rankings: readonly { bookOptionId: string; rank: number }[],
  meetingOptionIds: ReadonlySet<string>
): ValidationResult {
  const optionIds = rankings.map((r) => r.bookOptionId);

  if (hasDuplicates(optionIds)) {
    return invalid("Each book can only be ranked once");
  }
  if (optionIds.some((id) => !meetingOptionIds.has(id))) {
    return invalid(
      "Ballot contains a book that is not an option for this meeting"
    );
  }
  if (!isContiguousRanking(rankings.map((r) => r.rank))) {
    return invalid("Ranks must be consecutive starting at 1");
  }
  return valid;
}

/**
 * Validate a member's personal rankings for a year.
 *
 * @param rankedBooks - Books the member read, with ranks 1..N
 * @param unreadBooks - Books the member marked as not read
 * @param yearBookIds - Books selected at the club's finalized meetings that year
 */
export function validateYearRankings(
  rankedBooks: readonly { bookId: string; rank: number }[],
  unreadBooks: readonly string[],
  yearBookIds: ReadonlySet<string>
): ValidationResult {
  const rankedIds = rankedBooks.map((b) => b.bookId);

  if (hasDuplicates(rankedIds) || hasDuplicates([...unreadBooks])) {
    return invalid("Each book can only appear once");
  }

  const rankedSet = new Set(rankedIds);
  if (unreadBooks.some((id) => rankedSet.has(id))) {
    return invalid("A book cannot be both ranked and marked as not read");
  }

  if ([...rankedIds, ...unreadBooks].some((id) => !yearBookIds.has(id))) {
    return invalid("Rankings include a book that was not read this year");
  }

  if (!isContiguousRanking(rankedBooks.map((b) => b.rank))) {
    return invalid("Ranks must be consecutive starting at 1");
  }

  return valid;
}

/**
 * Voting is closed once the meeting is finalized or its voting deadline has
 * passed. The deadline instant itself is still open, matching
 * getBookClubState() and the save_* database functions.
 */
export function isVotingClosed(
  meeting: { is_finalized: boolean | null; voting_deadline: string | null },
  now: Date = new Date()
): boolean {
  if (meeting.is_finalized) return true;
  if (!meeting.voting_deadline) return false;
  return now.getTime() > new Date(meeting.voting_deadline).getTime();
}
