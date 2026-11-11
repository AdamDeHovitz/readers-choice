"use server";

import { revalidatePath } from "next/cache";
import { normalizeNominationNote } from "@/lib/nomination-note";
import type { BookSearchResult } from "@/lib/open-library";
import { UserError } from "@/lib/user-error";
import type { ActionResult } from "@/contract/result";
import { runAction } from "@/server/action";
import { requireMember } from "@/server/authz";
import { saveBook } from "@/server/books";
import { getBookOptionContext, getMeetingContext } from "@/server/meetings";
import * as nominations from "@/server/nominations";

/** Nominate a book for a meeting, with an optional note from the nominator. */
export async function nominateBook(
  meetingId: string,
  book: BookSearchResult,
  note?: string | null
): Promise<ActionResult> {
  return runAction("Failed to nominate book", async ({ db, userId }) => {
    const nominationNote = normalizeNominationNote(note);
    const meeting = await getMeetingContext(db, meetingId);
    nominations.assertNominationsOpen(meeting);
    await requireMember(
      db,
      meeting.bookClubId,
      userId,
      "You must be a member of this book club to nominate books"
    );

    const bookId = await saveBook(db, book);
    await nominations.nominateBook(db, meeting, bookId, userId, nominationNote);

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
      nominations.assertNominationsOpen(option.meeting);

      await nominations.updateNominationNote(db, bookOptionId, nominationNote);

      revalidatePath(`/meetings/${option.meeting.id}`);
    }
  );
}
