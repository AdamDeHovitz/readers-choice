import "server-only";
import { isNominationClosed } from "@readers-choice/core/meeting-schedule";
import { UserError } from "@readers-choice/core/user-error";
import type { Db } from "./db";
import type { MeetingContext } from "./meetings";

export function assertNominationsOpen(meeting: MeetingContext): void {
  if (meeting.isFinalized) throw new UserError("Meeting has been finalized");
  if (isNominationClosed(meeting)) {
    throw new UserError("Nomination period has ended");
  }
}

/**
 * Nominate a saved book for a meeting during its nomination window. The
 * book's description and length are copied onto the nomination so admins
 * can edit them per meeting without touching the shared book row.
 */
export async function nominateBook(
  db: Db,
  meeting: MeetingContext,
  bookId: string,
  nominatedBy: string,
  note: string | null
): Promise<void> {
  assertNominationsOpen(meeting);

  const [existing, book] = await Promise.all([
    db
      .from("book_options")
      .select("id")
      .eq("meeting_id", meeting.id)
      .eq("book_id", bookId)
      .maybeSingle(),
    db
      .from("books")
      .select("description, page_count")
      .eq("id", bookId)
      .single(),
  ]);
  if (existing.error) throw existing.error;
  if (book.error) throw book.error;
  if (existing.data) {
    throw new UserError(
      "This book has already been nominated for this meeting"
    );
  }

  const { error } = await db.from("book_options").insert({
    meeting_id: meeting.id,
    book_id: bookId,
    added_by: nominatedBy,
    description_override: book.data.description,
    page_count_override: book.data.page_count,
    nomination_note: note,
  });
  if (error) throw error;
}

export async function updateNominationNote(
  db: Db,
  bookOptionId: string,
  note: string | null
): Promise<void> {
  const { error } = await db
    .from("book_options")
    .update({ nomination_note: note })
    .eq("id", bookOptionId);
  if (error) throw error;
}
