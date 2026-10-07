"use server";

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { computeBordaRankings } from "@/lib/borda";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Rankings are members' personal opinions, so only club members may read them
 */
async function isCurrentUserMember(bookClubId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("book_club_id", bookClubId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  return !!member;
}

interface RankedBookSummary {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
}

interface RankingRowWithBook {
  user_id: string;
  book_id: string;
  rank: number | null;
  books: RankedBookSummary | RankedBookSummary[] | null;
}

interface GlobalRankingBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  totalPoints: number;
  numberOfRankings: number;
  averageRank: number;
}

/**
 * Calculate global rankings for a book club year using Borda Count
 *
 * Borda Count explanation:
 * - If a user has ranked N books, their #1 gets N points, #2 gets N-1, etc.
 * - Books not ranked (marked as "not read") get 0 points
 * - We sum points across all users to get global ranking
 */
export async function getGlobalRankings(
  bookClubId: string,
  year: number
): Promise<GlobalRankingBook[]> {
  if (!(await isCurrentUserMember(bookClubId))) return [];

  try {
    // Get all personal rankings for this book club and year
    const { data: rankings, error: rankingsError } = await supabase
      .from("personal_rankings")
      .select(
        `
        user_id,
        book_id,
        rank,
        books (
          id,
          title,
          author,
          cover_url
        )
      `
      )
      .eq("book_club_id", bookClubId)
      .eq("year", year)
      .not("rank", "is", null); // Only include ranked books

    if (rankingsError) {
      console.error("Error fetching rankings:", rankingsError);
      return [];
    }

    if (!rankings || rankings.length === 0) {
      return [];
    }

    const rows = rankings as unknown as RankingRowWithBook[];

    const booksById = new Map<string, RankedBookSummary>();
    for (const row of rows) {
      const book = Array.isArray(row.books) ? row.books[0] : row.books;
      if (book && !booksById.has(row.book_id)) {
        booksById.set(row.book_id, book);
      }
    }

    // Only score rows whose book still exists
    const borda = computeBordaRankings(
      rows
        .filter((r) => r.user_id && booksById.has(r.book_id))
        .map((r) => ({ userId: r.user_id, bookId: r.book_id, rank: r.rank }))
    );

    return borda.map((result) => {
      const book = booksById.get(result.bookId);
      return {
        id: result.bookId,
        title: book?.title || "Unknown",
        author: book?.author || "Unknown",
        coverUrl: book?.cover_url || null,
        totalPoints: result.totalPoints,
        numberOfRankings: result.numberOfRankings,
        averageRank: result.averageRank,
      };
    });
  } catch (error) {
    console.error("Error calculating global rankings:", error);
    return [];
  }
}

/**
 * Get available years that have rankings for a book club
 */
export async function getYearsWithRankings(
  bookClubId: string
): Promise<number[]> {
  if (!(await isCurrentUserMember(bookClubId))) return [];

  try {
    const { data, error } = await supabase
      .from("personal_rankings")
      .select("year")
      .eq("book_club_id", bookClubId)
      .not("rank", "is", null);

    if (error || !data) {
      return [];
    }

    // Get unique years and sort descending
    const years = [...new Set(data.map((r) => r.year))].sort((a, b) => b - a);
    return years;
  } catch (error) {
    console.error("Error fetching years:", error);
    return [];
  }
}

interface IndividualRanking {
  userId: string;
  userName: string;
  userImage: string | null;
  rank: number | null;
}

/**
 * Get individual member rankings for a specific book
 */
export async function getIndividualBookRankings(
  bookClubId: string,
  bookId: string,
  year: number
): Promise<IndividualRanking[]> {
  if (!(await isCurrentUserMember(bookClubId))) return [];

  try {
    // Get all rankings for this book with user information
    const { data: rankings, error: rankingsError } = await supabase
      .from("personal_rankings")
      .select(
        `
        user_id,
        rank,
        users (
          id,
          name,
          avatar_url
        )
      `
      )
      .eq("book_club_id", bookClubId)
      .eq("book_id", bookId)
      .eq("year", year)
      .not("rank", "is", null); // Only get ranked books (not "not read")

    if (rankingsError) {
      console.error("Error fetching rankings:", rankingsError);
      return [];
    }

    if (!rankings || rankings.length === 0) {
      return [];
    }

    // Map to individual rankings format
    const individualRankings: IndividualRanking[] = rankings
      .map((ranking) => {
        const user = ranking.users as any;
        return {
          userId: ranking.user_id,
          userName: user?.name || "Unknown User",
          userImage: user?.avatar_url || null,
          rank: ranking.rank,
        };
      })
      .sort((a, b) => {
        // Sort by rank (ascending - lower rank is better)
        if (a.rank === null && b.rank === null) return 0;
        if (a.rank === null) return 1;
        if (b.rank === null) return -1;
        return a.rank - b.rank;
      });

    return individualRankings;
  } catch (error) {
    console.error("Error fetching individual rankings:", error);
    return [];
  }
}
