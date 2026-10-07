"use server";

import { auth } from "@/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { validateYearRankings } from "@/lib/ballot-validation";
import { dbErrorMessage } from "@/lib/db-errors";
import { getUtcYear, getUtcYearRange } from "@/lib/utc-year";

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
      years.add(getUtcYear(meeting.meeting_date));
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

    // Get finalized meetings for the year (UTC) with books
    const { start, end } = getUtcYearRange(year);

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
      .gte("meeting_date", start)
      .lt("meeting_date", end)
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
 * Save user's rankings for a year, replacing any previous rankings.
 *
 * Ranks must be exactly 1..N, a book can't be both ranked and unread, and
 * every book must be a finalized pick of this club in that (UTC) year.
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

  if (
    !Number.isInteger(year) ||
    !Array.isArray(rankedBooks) ||
    !Array.isArray(unreadBooks)
  ) {
    return { error: "Invalid rankings" };
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
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("user_id")
      .eq("book_club_id", bookClubId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      return { error: "You must be a member to save rankings" };
    }

    // Books eligible for this year: the club's finalized picks
    const { start, end } = getUtcYearRange(year);
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select("selected_book_id")
      .eq("book_club_id", bookClubId)
      .eq("is_finalized", true)
      .not("selected_book_id", "is", null)
      .gte("meeting_date", start)
      .lt("meeting_date", end);

    if (meetingsError) throw meetingsError;

    const validation = validateYearRankings(
      rankedBooks,
      unreadBooks,
      new Set((meetings ?? []).map((m) => m.selected_book_id as string))
    );
    if (!validation.ok) {
      return { error: validation.error };
    }

    // Replace the user's rankings for the year in one transaction
    const { error: saveError } = await supabase.rpc("save_year_rankings", {
      p_user_id: session.user.id,
      p_book_club_id: bookClubId,
      p_year: year,
      p_ranked: rankedBooks.map((rb) => ({
        book_id: rb.bookId,
        rank: rb.rank,
      })),
      p_unread: unreadBooks,
    });

    if (saveError) {
      const message = dbErrorMessage(saveError);
      if (message) return { error: message };
      throw saveError;
    }

    revalidatePath(`/book-clubs/${bookClubId}/rankings`);
    return { success: true };
  } catch (error) {
    console.error("Error saving rankings:", error);
    return { error: "Failed to save rankings" };
  }
}
