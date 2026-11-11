import { UserError } from "./user-error";

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
    throw new UserError(
      `Nomination note must be ${NOMINATION_NOTE_MAX_LENGTH} characters or fewer`
    );
  }
  return trimmed;
}
