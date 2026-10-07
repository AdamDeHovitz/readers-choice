"use server";

import { addBookToDatabase } from "./books";
import { revalidatePath } from "next/cache";
import type { BookSearchResult } from "@/lib/open-library";
import { authenticatedAction } from "@/lib/safe-action";
import {
  isNominationClosed,
  normalizeNominationNote,
} from "@/lib/nomination-note";

function assertNominationsOpen(meeting: {
  is_finalized: boolean | null;
  nomination_deadline: string | null;
}) {
  if (meeting.is_finalized) {
    throw new Error("Meeting has been finalized");
  }
  if (isNominationClosed(meeting)) {
    throw new Error("Nomination period has ended");
  }
}

/**
 * Nominate a book for a meeting, with an optional note from the nominator.
 * This adds the book to the database and creates a book_option entry.
 */
export async function nominateBook(
  meetingId: string,
  book: BookSearchResult,
  note?: string | null
) {
  return authenticatedAction(async ({ session, supabase }) => {
    const nominationNote = normalizeNominationNote(note);

    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id, is_finalized, nomination_deadline")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      throw new Error("Meeting not found");
    }

    assertNominationsOpen(meeting);

    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      throw new Error(
        "You must be a member of this book club to nominate books"
      );
    }

    // Add book to database (or get existing book ID)
    const bookResult = await addBookToDatabase(book);

    if (bookResult.error || !bookResult.bookId) {
      throw new Error("Failed to add book to database");
    }

    const { data: existingOption } = await supabase
      .from("book_options")
      .select("id")
      .eq("meeting_id", meetingId)
      .eq("book_id", bookResult.bookId)
      .maybeSingle();

    if (existingOption) {
      throw new Error("This book has already been nominated for this meeting");
    }

    const { data: savedBook } = await supabase
      .from("books")
      .select("description, page_count")
      .eq("id", bookResult.bookId)
      .single();

    const { error: optionError } = await supabase.from("book_options").insert({
      meeting_id: meetingId,
      book_id: bookResult.bookId,
      added_by: session.user.id,
      description_override: savedBook?.description || null,
      page_count_override: savedBook?.page_count || null,
      nomination_note: nominationNote,
    });

    if (optionError) {
      console.error("Error nominating book:", optionError);
      throw new Error("Failed to nominate book");
    }

    revalidatePath(`/book-clubs/${meeting.book_club_id}`);
    revalidatePath(`/meetings/${meetingId}`);
  });
}

/**
 * Update the note on your own nomination while nominations are open.
 */
export async function updateNominationNote(
  bookOptionId: string,
  note: string | null
) {
  return authenticatedAction(async ({ session, supabase }) => {
    const nominationNote = normalizeNominationNote(note);

    const { data: option } = await supabase
      .from("book_options")
      .select(
        "added_by, meeting_id, meetings!inner(book_club_id, is_finalized, nomination_deadline)"
      )
      .eq("id", bookOptionId)
      .single();

    if (!option || option.added_by !== session.user.id) {
      throw new Error("You can only edit notes on your own nominations");
    }

    const meeting = option.meetings as unknown as {
      book_club_id: string;
      is_finalized: boolean | null;
      nomination_deadline: string | null;
    };

    // Nominators who have since left the club can't keep editing.
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!member) {
      throw new Error("You must be a member of this book club");
    }

    assertNominationsOpen(meeting);

    const { error } = await supabase
      .from("book_options")
      .update({ nomination_note: nominationNote })
      .eq("id", bookOptionId);

    if (error) {
      console.error("Error updating nomination note:", error);
      throw new Error("Failed to update nomination note");
    }

    revalidatePath(`/meetings/${option.meeting_id}`);
  });
}
