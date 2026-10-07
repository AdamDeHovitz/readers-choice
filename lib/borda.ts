/**
 * Borda Count aggregation of members' personal year rankings.
 *
 * - A member who ranked N books gives their #1 N points, #2 N-1, ..., #N 1.
 * - Books marked "not read" (rank null) earn nothing and do not count toward N.
 * - Results sort by total points (desc), then average rank (asc), then book id
 *   so ties are always ordered the same way.
 */

export interface PersonalRankingRow {
  userId: string;
  bookId: string;
  rank: number | null;
}

export interface BordaResult {
  bookId: string;
  totalPoints: number;
  numberOfRankings: number;
  averageRank: number;
}

export function computeBordaRankings(
  rows: readonly PersonalRankingRow[]
): BordaResult[] {
  const rankedByUser = new Map<string, { bookId: string; rank: number }[]>();
  for (const { userId, bookId, rank } of rows) {
    if (rank === null) continue;
    const list = rankedByUser.get(userId);
    if (list) {
      list.push({ bookId, rank });
    } else {
      rankedByUser.set(userId, [{ bookId, rank }]);
    }
  }

  const totals = new Map<
    string,
    { totalPoints: number; numberOfRankings: number; totalRank: number }
  >();

  for (const userBooks of rankedByUser.values()) {
    const maxPoints = userBooks.length;
    for (const { bookId, rank } of userBooks) {
      const points = maxPoints - rank + 1;
      const entry = totals.get(bookId) ?? {
        totalPoints: 0,
        numberOfRankings: 0,
        totalRank: 0,
      };
      entry.totalPoints += points;
      entry.numberOfRankings += 1;
      entry.totalRank += rank;
      totals.set(bookId, entry);
    }
  }

  return [...totals.entries()]
    .map(([bookId, t]) => ({
      bookId,
      totalPoints: t.totalPoints,
      numberOfRankings: t.numberOfRankings,
      averageRank: t.totalRank / t.numberOfRankings,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (a.averageRank !== b.averageRank) return a.averageRank - b.averageRank;
      return a.bookId < b.bookId ? -1 : a.bookId > b.bookId ? 1 : 0;
    });
}
