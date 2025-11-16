"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { addBookToDatabase } from "./books";
import { revalidatePath } from "next/cache";
import type { BookSearchResult } from "@/lib/google-books";

/**
 * Nominate a book for a meeting
 * This adds the book to the database and creates a book_option entry
 */
export async function nominateBook(
  meetingId: string,
  book: BookSearchResult
) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get meeting details
    const { data: meeting } = await supabase
      .from("meetings")
      .select("book_club_id, is_finalized, nomination_deadline")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    if (meeting.is_finalized) {
      return { error: "Meeting has been finalized" };
    }

    // Check if nomination deadline has passed
    if (meeting.nomination_deadline) {
      const deadline = new Date(meeting.nomination_deadline);
      const now = new Date();
      if (now > deadline) {
        return { error: "Nomination period has ended" };
      }
    }

    // Check if user is a member of the book club
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("book_club_id", meeting.book_club_id)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return { error: "You must be a member of this book club to nominate books" };
    }

    // Add book to database (or get existing book ID)
    const bookResult = await addBookToDatabase(book);

    if (bookResult.error || !bookResult.bookId) {
      return { error: "Failed to add book to database" };
    }

    // Check if this book has already been nominated for this meeting
    const { data: existingOption } = await supabase
      .from("book_options")
      .select("id")
      .eq("meeting_id", meetingId)
      .eq("book_id", bookResult.bookId)
      .single();

    if (existingOption) {
      return { error: "This book has already been nominated for this meeting" };
    }

    // Add book option
    const { error: optionError } = await supabase.from("book_options").insert({
      meeting_id: meetingId,
      book_id: bookResult.bookId,
      added_by: session.user.id,
    });

    if (optionError) throw optionError;

    revalidatePath(`/book-clubs/${meeting.book_club_id}`);
    revalidatePath(`/book-clubs/${meeting.book_club_id}/nominate`);
    revalidatePath(`/meetings/${meetingId}`);

    return { success: true };
  } catch (error) {
    console.error("Error nominating book:", error);
    return { error: "Failed to nominate book" };
  }
}
