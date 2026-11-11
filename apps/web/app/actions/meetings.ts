"use server";

import { revalidatePath } from "next/cache";
import type { BookSearchResult } from "@readers-choice/core/open-library";
import type { ActionResult } from "@readers-choice/contract/result";
import { runAction } from "@/server/action";
import { requireAdmin } from "@/server/authz";
import { saveBook } from "@/server/books";
import type { Db } from "@/server/db";
import { optionalDate, optionalText, requiredDate } from "@/server/input";
import * as meetings from "@/server/meetings";
import { findOrCreateTheme } from "@/server/themes";

/** Editable meeting fields. Dates are ISO strings; blank means none. */
export interface MeetingFields {
  meetingDate: string;
  nominationDeadline?: string | null;
  votingDeadline?: string | null;
  /** A blank theme means none; a new name creates the theme. */
  themeName?: string | null;
  details?: string | null;
}

/** Validate fields and resolve the theme name to a theme id. */
async function toMeetingInput(
  db: Db,
  bookClubId: string,
  fields: MeetingFields,
  userId: string
): Promise<meetings.MeetingInput> {
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
    themeId: await findOrCreateTheme(db, bookClubId, fields.themeName, userId),
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
    await requireAdmin(
      db,
      bookClubId,
      userId,
      "Only admins can create meetings"
    );

    const input = await toMeetingInput(db, bookClubId, fields, userId);
    const meetingId = await meetings.insertMeeting(db, bookClubId, input);

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { meetingId };
  });
}

/** Record a meeting that already happened, with its book (admins only). */
export async function logPastMeeting(
  bookClubId: string,
  fields: Pick<MeetingFields, "meetingDate" | "themeName" | "details">,
  book: BookSearchResult
): Promise<ActionResult<{ meetingId: string }>> {
  return runAction("Failed to log past meeting", async ({ db, userId }) => {
    await requireAdmin(
      db,
      bookClubId,
      userId,
      "Only admins can log past meetings"
    );

    const [input, bookId] = await Promise.all([
      toMeetingInput(db, bookClubId, fields, userId),
      saveBook(db, book),
    ]);
    const meetingId = await meetings.insertPastMeeting(
      db,
      bookClubId,
      input,
      bookId,
      userId
    );

    revalidatePath(`/book-clubs/${bookClubId}`);
    return { meetingId };
  });
}

/**
 * Update a meeting's details (admins only). Pass `newBook` to change the
 * selected book; omit it to keep the current one.
 */
export async function updateMeeting(
  meetingId: string,
  fields: MeetingFields,
  newBook?: BookSearchResult | null
): Promise<ActionResult> {
  return runAction("Failed to update meeting", async ({ db, userId }) => {
    const meeting = await meetings.getMeetingContext(db, meetingId);
    await requireAdmin(
      db,
      meeting.bookClubId,
      userId,
      "Only admins can update meetings"
    );

    const [input, bookId] = await Promise.all([
      toMeetingInput(db, meeting.bookClubId, fields, userId),
      newBook ? saveBook(db, newBook) : null,
    ]);
    await meetings.updateMeeting(db, meetingId, input, bookId);

    revalidateMeeting(meetingId, meeting.bookClubId);
  });
}

/** Delete a meeting with its options and votes (admins only). */
export async function deleteMeeting(meetingId: string): Promise<ActionResult> {
  return runAction("Failed to delete meeting", async ({ db, userId }) => {
    const meeting = await meetings.getMeetingContext(db, meetingId);
    await requireAdmin(
      db,
      meeting.bookClubId,
      userId,
      "You must be an admin to delete meetings"
    );
    await meetings.deleteMeeting(db, meetingId);

    revalidatePath(`/book-clubs/${meeting.bookClubId}/schedule`);
    revalidatePath(`/book-clubs/${meeting.bookClubId}`);
  });
}

/** Override a nomination's description and page count (admins only). */
export async function updateBookOptionMetadata(
  bookOptionId: string,
  description: string,
  pageCount: number | null
): Promise<ActionResult> {
  return runAction("Failed to update book details", async ({ db, userId }) => {
    const option = await meetings.getBookOptionContext(db, bookOptionId);
    await requireAdmin(
      db,
      option.meeting.bookClubId,
      userId,
      "Only admins can edit book details"
    );
    await meetings.updateBookOptionMetadata(
      db,
      bookOptionId,
      optionalText(description),
      pageCount
    );

    revalidatePath(`/meetings/${option.meeting.id}`);
  });
}

/** Pick the meeting's book from its options (admins only). */
export async function finalizeMeeting(
  meetingId: string,
  selectedBookId: string
): Promise<ActionResult> {
  return runAction("Failed to finalize meeting", async ({ db, userId }) => {
    const meeting = await meetings.getMeetingContext(db, meetingId);
    await requireAdmin(
      db,
      meeting.bookClubId,
      userId,
      "Only admins can finalize meetings"
    );
    await meetings.finalizeMeeting(db, meeting, selectedBookId, userId);

    revalidateMeeting(meetingId, meeting.bookClubId);
  });
}
