"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/**
 * Get all years that have finalized meetings for a book club
 */
export async function getBookClubYears(bookClubId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
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

    // Check if user is a member
    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return [];
    }

    // Get all finalized meetings and extract unique years
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("meeting_date")
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", true)
      .not("selected_book_id", "is", null)
      .order("meeting_date", { ascending: false });

    if (error) throw error;

    // Extract unique years
    const years = new Set<number>();
    meetings?.forEach((meeting) => {
      const year = new Date(meeting.meeting_date).getFullYear();
      years.add(year);
    });

    return Array.from(years).sort((a, b) => b - a); // Most recent first
  } catch (error) {
    console.error("Error fetching book club years:", error);
    return [];
  }
}

/**
 * Get books for a specific year with user's rankings
 */
export async function getYearBooks(bookClubId: string, year: number) {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
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

    // Check if user is a member
    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return [];
    }

    // Get finalized meetings for the year with books
    const startDate = new Date(year, 0, 1).toISOString();
    const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();

    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select(
        `
        id,
        meeting_date,
        selected_book_id,
        books:books!meetings_selected_book_id_fkey (
          id,
          title,
          author,
          cover_url,
          description
        )
      `
      )
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", true)
      .not("selected_book_id", "is", null)
      .gte("meeting_date", startDate)
      .lte("meeting_date", endDate)
      .order("meeting_date", { ascending: true });

    if (meetingsError) throw meetingsError;

    if (!meetings || meetings.length === 0) {
      return [];
    }

    // Get user's existing rankings for this year
    const bookIds = meetings.map((m) => m.selected_book_id).filter(Boolean);

    const { data: rankings, error: rankingsError } = await supabase
      .from("personal_rankings")
      .select("book_id, rank")
      .eq("user_id", session.user.id)
      .eq("book_club_id", bookClubId)
      .eq("year", year)
      .in("book_id", bookIds);

    if (rankingsError) throw rankingsError;

    // Map rankings by book_id
    const rankingsMap = new Map();
    rankings?.forEach((r) => {
      rankingsMap.set(r.book_id, r.rank);
    });

    // Combine meetings with rankings
    const books = meetings.map((meeting: any) => {
      const book = meeting.books;
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        description: book.description,
        meetingDate: meeting.meeting_date,
        rank: rankingsMap.get(book.id) ?? null, // null means "not read"
      };
    });

    // Sort: ranked books first (by rank), then unranked
    return books.sort((a, b) => {
      if (a.rank === null && b.rank === null) return 0;
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    });
  } catch (error) {
    console.error("Error fetching year books:", error);
    return [];
  }
}

/**
 * Save user's rankings for a year
 */
export async function saveYearRankings(
  bookClubId: string,
  year: number,
  rankedBooks: { bookId: string; rank: number }[],
  unreadBooks: string[]
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

    // Check if user is a member
    const { data: member } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .single();

    if (!member) {
      return { error: "You must be a member to save rankings" };
    }

    // Delete all existing rankings for this user, book club, and year
    await supabase
      .from("personal_rankings")
      .delete()
      .eq("user_id", session.user.id)
      .eq("book_club_id", bookClubId)
      .eq("year", year);

    // Insert new rankings
    const rankingsToInsert = [
      // Ranked books
      ...rankedBooks.map((rb) => ({
        user_id: session.user.id,
        book_club_id: bookClubId,
        book_id: rb.bookId,
        year,
        rank: rb.rank,
      })),
      // Unread books (rank = null)
      ...unreadBooks.map((bookId) => ({
        user_id: session.user.id,
        book_club_id: bookClubId,
        book_id: bookId,
        year,
        rank: null,
      })),
    ];

    if (rankingsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("personal_rankings")
        .insert(rankingsToInsert);

      if (insertError) throw insertError;
    }

    revalidatePath(`/book-clubs/${bookClubId}/rankings`);
    return { success: true };
  } catch (error) {
    console.error("Error saving rankings:", error);
    return { error: "Failed to save rankings" };
  }
}
