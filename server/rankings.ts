import "server-only";
import { validateYearRankings } from "@/lib/ballot-validation";
import { computeBordaRankings } from "@/lib/borda";
import { UserError } from "@/lib/user-error";
import { getUtcYear, getUtcYearRange } from "@/lib/utc-year";
import { isMember } from "./authz";
import type { Db } from "./db";
import { throwIfDbError } from "./errors";
import type { Viewer } from "./viewer";

/**
 * Rankings are members' personal opinions: every query here returns nothing
 * unless the viewer belongs to the club.
 */

/** A club's finalized picks, optionally limited to one UTC year. */
function finalizedPicks(db: Db, bookClubId: string, year?: number) {
  let query = db
    .from("meetings")
    .select(
      `meeting_date, selected_book_id,
       books:books!meetings_selected_book_id_fkey (id, title, author, cover_url, description)`
    )
    .eq("book_club_id", bookClubId)
    .eq("is_finalized", true)
    .not("selected_book_id", "is", null);
  if (year !== undefined) {
    const { start, end } = getUtcYearRange(year);
    query = query.gte("meeting_date", start).lt("meeting_date", end);
  }
  return query.order("meeting_date", { ascending: true });
}

/** Years (UTC) in which the club finalized a pick, most recent first. */
export async function getBookClubYears(
  { db, userId }: Viewer,
  bookClubId: string
): Promise<number[]> {
  if (!(await isMember(db, bookClubId, userId))) return [];

  const { data, error } = await finalizedPicks(db, bookClubId);
  if (error) throw error;

  const years = new Set(data.map((m) => getUtcYear(m.meeting_date)));
  return [...years].sort((a, b) => b - a);
}

/** The ids of books the club picked in a (UTC) year. */
export async function getYearBookIds(
  db: Db,
  bookClubId: string,
  year: number
): Promise<Set<string>> {
  const { data, error } = await finalizedPicks(db, bookClubId, year);
  if (error) throw error;
  return new Set(data.flatMap((m) => m.selected_book_id ?? []));
}

export interface YearBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  meetingDate: string;
  /** null means the member marked it "not read" (or hasn't ranked it). */
  rank: number | null;
}

/** The club's picks for a year with the viewer's ranks; ranked books first. */
export async function getYearBooks(
  { db, userId }: Viewer,
  bookClubId: string,
  year: number
): Promise<YearBook[]> {
  if (!(await isMember(db, bookClubId, userId))) return [];

  const { data: meetings, error } = await finalizedPicks(db, bookClubId, year);
  if (error) throw error;

  const picks = meetings.flatMap((m) =>
    m.books ? [{ book: m.books, meetingDate: m.meeting_date }] : []
  );
  if (picks.length === 0) return [];

  const { data: rankings, error: rankingsError } = await db
    .from("personal_rankings")
    .select("book_id, rank")
    .eq("user_id", userId)
    .eq("book_club_id", bookClubId)
    .eq("year", year)
    .in(
      "book_id",
      picks.map((p) => p.book.id)
    );
  if (rankingsError) throw rankingsError;

  const rankByBook = new Map(rankings.map((r) => [r.book_id, r.rank]));

  return picks
    .map(({ book, meetingDate }) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.cover_url,
      description: book.description,
      meetingDate,
      rank: rankByBook.get(book.id) ?? null,
    }))
    .sort(byRankNullsLast);
}

function byRankNullsLast(
  a: { rank: number | null },
  b: { rank: number | null }
) {
  if (a.rank === null && b.rank === null) return 0;
  if (a.rank === null) return 1;
  if (b.rank === null) return -1;
  return a.rank - b.rank;
}

export interface GlobalRankingBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  totalPoints: number;
  numberOfRankings: number;
  averageRank: number;
}

/**
 * Club-wide rankings for a year using Borda count: a member who ranked N
 * books gives their #1 N points, #2 N-1, and so on; unread books get none.
 */
export async function getGlobalRankings(
  { db, userId }: Viewer,
  bookClubId: string,
  year: number
): Promise<GlobalRankingBook[]> {
  if (!(await isMember(db, bookClubId, userId))) return [];

  const { data: rows, error } = await db
    .from("personal_rankings")
    .select("user_id, book_id, rank, books (id, title, author, cover_url)")
    .eq("book_club_id", bookClubId)
    .eq("year", year)
    .not("rank", "is", null);
  if (error) throw error;

  // Only score rows whose user and book still exist.
  const scored = rows.flatMap(({ user_id, book_id, rank, books }) =>
    user_id && book_id && books
      ? [{ userId: user_id, bookId: book_id, rank, book: books }]
      : []
  );
  const booksById = new Map(scored.map((r) => [r.bookId, r.book]));
  const borda = computeBordaRankings(scored);

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
}

/** Years with at least one ranking, most recent first. */
export async function getYearsWithRankings(
  { db, userId }: Viewer,
  bookClubId: string
): Promise<number[]> {
  if (!(await isMember(db, bookClubId, userId))) return [];

  const { data, error } = await db
    .from("personal_rankings")
    .select("year")
    .eq("book_club_id", bookClubId)
    .not("rank", "is", null);
  if (error) throw error;

  return [...new Set(data.map((r) => r.year))].sort((a, b) => b - a);
}

export interface IndividualRanking {
  userId: string;
  userName: string;
  userImage: string | null;
  rank: number | null;
}

/** How each member ranked one book in a year, best rank first. */
export async function getIndividualBookRankings(
  { db, userId }: Viewer,
  bookClubId: string,
  bookId: string,
  year: number
): Promise<IndividualRanking[]> {
  if (!(await isMember(db, bookClubId, userId))) return [];

  const { data, error } = await db
    .from("personal_rankings")
    .select("user_id, rank, users (name, avatar_url)")
    .eq("book_club_id", bookClubId)
    .eq("book_id", bookId)
    .eq("year", year)
    .not("rank", "is", null);
  if (error) throw error;

  return data
    .flatMap(({ user_id, rank, users }) =>
      user_id
        ? [
            {
              userId: user_id,
              userName: users?.name || "Unknown User",
              userImage: users?.avatar_url || null,
              rank,
            },
          ]
        : []
    )
    .sort(byRankNullsLast);
}

/**
 * Replace a user's rankings for a year in one transaction. Ranks must be
 * exactly 1..N, a book can't be both ranked and unread, and every book must
 * be one of the club's finalized picks that (UTC) year.
 */
export async function saveYearRankings(
  db: Db,
  userId: string,
  bookClubId: string,
  year: number,
  rankedBooks: readonly { bookId: string; rank: number }[],
  unreadBooks: readonly string[]
): Promise<void> {
  if (
    !Number.isInteger(year) ||
    !Array.isArray(rankedBooks) ||
    !Array.isArray(unreadBooks)
  ) {
    throw new UserError("Invalid rankings");
  }

  const validation = validateYearRankings(
    rankedBooks,
    unreadBooks,
    await getYearBookIds(db, bookClubId, year)
  );
  if (!validation.ok) throw new UserError(validation.error);

  const { error } = await db.rpc("save_year_rankings", {
    p_user_id: userId,
    p_book_club_id: bookClubId,
    p_year: year,
    p_ranked: rankedBooks.map((rb) => ({ book_id: rb.bookId, rank: rb.rank })),
    p_unread: [...unreadBooks],
  });
  throwIfDbError(error);
}
