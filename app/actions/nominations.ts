"use server";

import { revalidatePath } from "next/cache";
import { isNominationClosed } from "@/lib/meeting-schedule";
import { normalizeNominationNote } from "@/lib/nomination-note";
import type { BookSearchResult } from "@/lib/open-library";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { requireMember } from "@/server/authz";
import { saveBook } from "@/server/books";
import {
  getBookOptionContext,
  getMeetingContext,
  type MeetingContext,
} from "@/server/meetings";

function assertNominationsOpen(meeting: MeetingContext) {
  if (meeting.isFinalized) throw new UserError("Meeting has been finalized");
  if (isNominationClosed(meeting)) {
    throw new UserError("Nomination period has ended");
  }
}

/** Nominate a book for a meeting, with an optional note from the nominator. */
export async function nominateBook(
  meetingId: string,
  book: BookSearchResult,
  note?: string | null
): Promise<ActionResult> {
  return runAction("Failed to nominate book", async ({ db, userId }) => {
    const nominationNote = normalizeNominationNote(note);
    const meeting = await getMeetingContext(db, meetingId);
    assertNominationsOpen(meeting);
    await requireMember(
      db,
      meeting.bookClubId,
      userId,
      "You must be a member of this book club to nominate books"
    );

    const bookId = await saveBook(db, book);

    const { data: existing, error: existingError } = await db
      .from("book_options")
      .select("id")
      .eq("meeting_id", meetingId)
      .eq("book_id", bookId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      throw new UserError(
        "This book has already been nominated for this meeting"
      );
    }

    // Snapshot the book's description and length so admins can edit them per
    // nomination without touching the shared book row.
    const { data: saved, error: savedError } = await db
      .from("books")
      .select("description, page_count")
      .eq("id", bookId)
      .single();
    if (savedError) throw savedError;

    const { error } = await db.from("book_options").insert({
      meeting_id: meetingId,
      book_id: bookId,
      added_by: userId,
      description_override: saved.description,
      page_count_override: saved.page_count,
      nomination_note: nominationNote,
    });
    if (error) throw error;

    revalidatePath(`/book-clubs/${meeting.bookClubId}`);
    revalidatePath(`/meetings/${meetingId}`);
  });
}

/** Update the note on your own nomination while nominations are open. */
export async function updateNominationNote(
  bookOptionId: string,
  note: string | null
): Promise<ActionResult> {
  return runAction(
    "Failed to update nomination note",
    async ({ db, userId }) => {
      const nominationNote = normalizeNominationNote(note);
      const option = await getBookOptionContext(db, bookOptionId);
      if (option.addedBy !== userId) {
        throw new UserError("You can only edit notes on your own nominations");
      }
      // Nominators who have since left the club can't keep editing.
      await requireMember(db, option.meeting.bookClubId, userId);
      assertNominationsOpen(option.meeting);

      const { error } = await db
        .from("book_options")
        .update({ nomination_note: nominationNote })
        .eq("id", bookOptionId);
      if (error) throw error;

      revalidatePath(`/meetings/${option.meeting.id}`);
    }
  );
}
