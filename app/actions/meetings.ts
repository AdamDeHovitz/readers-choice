"use server";

import { revalidatePath } from "next/cache";
import type { BookSearchResult } from "@/lib/open-library";
import { UserError } from "@/lib/user-error";
import { runAction, type ActionResult } from "@/server/action";
import { requireAdmin } from "@/server/authz";
import { saveBook } from "@/server/books";
import { optionalDate, optionalText, requiredDate } from "@/server/input";
import { getBookOptionContext, getMeetingContext } from "@/server/meetings";
import { findOrCreateTheme } from "@/server/themes";

/** Editable meeting fields. Dates are ISO strings; blank means none. */
export interface MeetingFields {
  meetingDate: string;
  nominationDeadline?: string | null;
  votingDeadline?: string | null;
  themeName?: string | null;
  details?: string | null;
}

function parseMeetingFields(fields: MeetingFields) {
  return {
    meetingDate: requiredDate(fields?.meetingDate, "Meeting date is required"),
    nominationDeadline: optionalDate(
      fields.nominationDeadline,
      "Invalid nomination deadline"
    ),
    votingDeadline: optionalDate(
      fields.votingDeadline,
      "Invalid voting deadline"
    ),
    themeName: optionalText(fields.themeName),
    details: optionalText(fields.details),
  };
}

function revalidateMeeting(meetingId: string, bookClubId: string) {
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/book-clubs/${bookClubId}`);
}

/** Schedule an upcoming meeting (admins only). */
export async function createMeeting(
  bookClubId: string,
  fields: MeetingFields
): Promise<ActionResult<{ meetingId: string }>> {
  return runAction("Failed to create meeting", async ({ db, userId }) => {
    const input = parseMeetingFields(fields);
    await requireAdmin(
      db,
      bookClubId,
      userId,
      "Only admins can create meetings"
    );

    const themeId = await findOrCreateTheme(
      db,
      bookClubId,
      input.themeName,
      userId
    );
    const { data: meeting, error } = await db
      .from("meetings")
      .insert({
        book_club_id: bookClubId,
        meeting_date: input.meetingDate,
        nomination_deadline: input.nominationDeadline,
        voting_deadline: input.votingDeadline,
        theme_id: themeId,
        details: input.details,
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { meetingId: meeting.id };
  });
}

/** Record a meeting that already happened, with its book (admins only). */
export async function logPastMeeting(
  bookClubId: string,
  fields: Pick<MeetingFields, "meetingDate" | "themeName" | "details">,
  book: BookSearchResult
): Promise<ActionResult<{ meetingId: string }>> {
  return runAction("Failed to log past meeting", async ({ db, userId }) => {
    const input = parseMeetingFields(fields);
    await requireAdmin(
      db,
      bookClubId,
      userId,
      "Only admins can log past meetings"
    );

    const [themeId, bookId] = await Promise.all([
      findOrCreateTheme(db, bookClubId, input.themeName, userId),
      saveBook(db, book),
    ]);
    const { data: meeting, error } = await db
      .from("meetings")
      .insert({
        book_club_id: bookClubId,
        meeting_date: input.meetingDate,
        theme_id: themeId,
        selected_book_id: bookId,
        details: input.details,
        is_finalized: true,
        finalized_at: new Date().toISOString(),
        finalized_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { meetingId: meeting.id };
  });
}

/**
 * Update a meeting's details (admins only). A blank theme clears it.
 * Pass `newBook` to change the selected book; omit it to keep the current one.
 */
export async function updateMeeting(
  meetingId: string,
  fields: MeetingFields,
  newBook?: BookSearchResult | null
): Promise<ActionResult> {
  return runAction("Failed to update meeting", async ({ db, userId }) => {
    const input = parseMeetingFields(fields);
    const meeting = await getMeetingContext(db, meetingId);
    await requireAdmin(
      db,
      meeting.bookClubId,
      userId,
      "Only admins can update meetings"
    );

    const [themeId, bookId] = await Promise.all([
      findOrCreateTheme(db, meeting.bookClubId, input.themeName, userId),
      newBook ? saveBook(db, newBook) : null,
    ]);
    const { error } = await db
      .from("meetings")
      .update({
        meeting_date: input.meetingDate,
        nomination_deadline: input.nominationDeadline,
        voting_deadline: input.votingDeadline,
        theme_id: themeId,
        details: input.details,
        ...(bookId && { selected_book_id: bookId }),
      })
      .eq("id", meetingId);
    if (error) throw error;

    revalidateMeeting(meetingId, meeting.bookClubId);
  });
}

/** Delete a meeting and (by cascade) its options and votes (admins only). */
export async function deleteMeeting(meetingId: string): Promise<ActionResult> {
  return runAction("Failed to delete meeting", async ({ db, userId }) => {
    const meeting = await getMeetingContext(db, meetingId);
    await requireAdmin(
      db,
      meeting.bookClubId,
      userId,
      "You must be an admin to delete meetings"
    );

    const { error } = await db.from("meetings").delete().eq("id", meetingId);
    if (error) throw error;

    revalidatePath(`/book-clubs/${meeting.bookClubId}/schedule`);
    revalidatePath(`/book-clubs/${meeting.bookClubId}`);
  });
}

/** Add a book option to an unfinalized meeting (admins only). */
export async function addBookOption(
  meetingId: string,
  book: BookSearchResult
): Promise<ActionResult> {
  return runAction("Failed to add book option", async ({ db, userId }) => {
    const meeting = await getMeetingContext(db, meetingId);
    if (meeting.isFinalized) throw new UserError("Meeting has been finalized");
    await requireAdmin(
      db,
      meeting.bookClubId,
      userId,
      "Only admins can add book options"
    );

    const bookId = await saveBook(db, book);
    const { error } = await db
      .from("book_options")
      .insert({ meeting_id: meetingId, book_id: bookId, added_by: userId });
    if (error) throw error;

    revalidatePath(`/meetings/${meetingId}`);
  });
}

/** Override a nomination's description and page count (admins only). */
export async function updateBookOptionMetadata(
  bookOptionId: string,
  description: string,
  pageCount: number | null
): Promise<ActionResult> {
  return runAction("Failed to update book details", async ({ db, userId }) => {
    if (
      pageCount !== null &&
      (!Number.isInteger(pageCount) || pageCount <= 0)
    ) {
      throw new UserError("Page count must be a positive whole number");
    }
    const option = await getBookOptionContext(db, bookOptionId);
    await requireAdmin(
      db,
      option.meeting.bookClubId,
      userId,
      "Only admins can edit book details"
    );

    const { error } = await db
      .from("book_options")
      .update({
        description_override: optionalText(description),
        page_count_override: pageCount,
      })
      .eq("id", bookOptionId);
    if (error) throw error;

    revalidatePath(`/meetings/${option.meeting.id}`);
  });
}

/** Pick the meeting's book from its options (admins only). */
export async function finalizeMeeting(
  meetingId: string,
  selectedBookId: string
): Promise<ActionResult> {
  return runAction("Failed to finalize meeting", async ({ db, userId }) => {
    const meeting = await getMeetingContext(db, meetingId);
    if (meeting.isFinalized) throw new UserError("Meeting already finalized");
    await requireAdmin(
      db,
      meeting.bookClubId,
      userId,
      "Only admins can finalize meetings"
    );

    const { data: option, error: optionError } = await db
      .from("book_options")
      .select("id")
      .eq("meeting_id", meetingId)
      .eq("book_id", selectedBookId)
      .maybeSingle();
    if (optionError) throw optionError;
    if (!option) {
      throw new UserError("Selected book is not an option for this meeting");
    }

    // The is_finalized guard makes concurrent finalizes pick exactly one winner.
    const { data: finalized, error } = await db
      .from("meetings")
      .update({
        is_finalized: true,
        selected_book_id: selectedBookId,
        finalized_at: new Date().toISOString(),
        finalized_by: userId,
      })
      .eq("id", meetingId)
      .eq("is_finalized", false)
      .select("id");
    if (error) throw error;
    if (finalized.length === 0)
      throw new UserError("Meeting already finalized");

    revalidateMeeting(meetingId, meeting.bookClubId);
  });
}
