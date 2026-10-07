/** Matches the CHECK constraint on book_options.nomination_note. */
export const NOMINATION_NOTE_MAX_LENGTH = 500;

/**
 * Normalize a nominator's note for storage: trims whitespace and maps blank
 * input to null. Throws if the note is too long.
 */
export function normalizeNominationNote(
  note: string | null | undefined
): string | null {
  const trimmed = note?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.length > NOMINATION_NOTE_MAX_LENGTH) {
    throw new Error(
      `Nomination note must be ${NOMINATION_NOTE_MAX_LENGTH} characters or fewer`
    );
  }
  return trimmed;
}

/**
 * Nominations are closed once the meeting is finalized or the nomination
 * deadline has passed. The deadline instant itself is still open, matching
 * isVotingClosed() and getBookClubState().
 */
export function isNominationClosed(
  meeting: { is_finalized: boolean | null; nomination_deadline: string | null },
  now: Date = new Date()
): boolean {
  if (meeting.is_finalized) return true;
  if (!meeting.nomination_deadline) return false;
  return now.getTime() > new Date(meeting.nomination_deadline).getTime();
}
