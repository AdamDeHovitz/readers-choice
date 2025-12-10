"use server";

import { createClient } from "@supabase/supabase-js";

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

    // Group rankings by user to calculate Borda points
    const userRankings = new Map<string, Array<{ bookId: string; rank: number }>>();

    rankings.forEach((ranking) => {
      const userId = ranking.user_id;
      if (!userId || !ranking.book_id || ranking.rank === null) return;

      if (!userRankings.has(userId)) {
        userRankings.set(userId, []);
      }

      userRankings.get(userId)!.push({
        bookId: ranking.book_id,
        rank: ranking.rank,
      });
    });

    // Calculate Borda Count points for each book
    const bookPoints = new Map<string, {
      book: any;
      totalPoints: number;
      numberOfRankings: number;
      totalRank: number; // Sum of ranks for average calculation
    }>();

    userRankings.forEach((userBooks) => {
      const maxPoints = userBooks.length;

      userBooks.forEach(({ bookId, rank }) => {
        // Borda Count: top rank gets most points
        const points = maxPoints - rank + 1;

        const ranking = rankings.find((r) => r.book_id === bookId);
        if (!ranking?.books) return;

        if (!bookPoints.has(bookId)) {
          bookPoints.set(bookId, {
            book: ranking.books,
            totalPoints: 0,
            numberOfRankings: 0,
            totalRank: 0,
          });
        }

        const bookData = bookPoints.get(bookId)!;
        bookData.totalPoints += points;
        bookData.numberOfRankings += 1;
        bookData.totalRank += rank;
      });
    });

    // Convert to array and sort by total points (descending)
    const globalRankings: GlobalRankingBook[] = Array.from(bookPoints.entries())
      .map(([bookId, data]) => {
        const book = data.book as any;
        return {
          id: bookId,
          title: book.title || "Unknown",
          author: book.author || "Unknown",
          coverUrl: book.cover_url || null,
          totalPoints: data.totalPoints,
          numberOfRankings: data.numberOfRankings,
          averageRank: data.totalRank / data.numberOfRankings,
        };
      })
      .sort((a, b) => {
        // Primary sort: total points (descending)
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        // Tiebreaker: average rank (ascending - lower is better)
        return a.averageRank - b.averageRank;
      });

    return globalRankings;
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
  try {
    // Get all members of the book club
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select(
        `
        user_id,
        users (
          id,
          name,
          image
        )
      `
      )
      .eq("book_club_id", bookClubId);

    if (membersError || !members) {
      console.error("Error fetching members:", membersError);
      return [];
    }

    // Get all rankings for this book
    const { data: rankings, error: rankingsError } = await supabase
      .from("personal_rankings")
      .select("user_id, rank")
      .eq("book_club_id", bookClubId)
      .eq("book_id", bookId)
      .eq("year", year);

    if (rankingsError) {
      console.error("Error fetching rankings:", rankingsError);
      return [];
    }

    // Create a map of user rankings
    const rankingsMap = new Map<string, number | null>();
    rankings?.forEach((r) => {
      rankingsMap.set(r.user_id, r.rank);
    });

    // Combine member info with their rankings
    const individualRankings: IndividualRanking[] = members
      .map((member) => {
        const user = member.users as any;
        return {
          userId: member.user_id,
          userName: user?.name || "Unknown User",
          userImage: user?.image || null,
          rank: rankingsMap.get(member.user_id) ?? null,
        };
      })
      .filter((r) => r.rank !== null) // Only show members who ranked this book
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
