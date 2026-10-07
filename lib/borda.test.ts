import { describe, it, expect } from "vitest";
import { computeBordaRankings } from "./borda";

describe("computeBordaRankings", () => {
  it("returns nothing for no rankings", () => {
    expect(computeBordaRankings([])).toEqual([]);
  });

  it("awards N..1 points per member and sums across members", () => {
    const result = computeBordaRankings([
      { userId: "u1", bookId: "A", rank: 1 },
      { userId: "u1", bookId: "B", rank: 2 },
      { userId: "u1", bookId: "C", rank: 3 },
      { userId: "u2", bookId: "B", rank: 1 },
      { userId: "u2", bookId: "A", rank: 2 },
      { userId: "u2", bookId: "C", rank: 3 },
    ]);

    // A: 3 + 2, B: 2 + 3, C: 1 + 1
    expect(result.map((r) => [r.bookId, r.totalPoints])).toEqual([
      ["A", 5],
      ["B", 5],
      ["C", 2],
    ]);
    expect(result[2]).toMatchObject({ numberOfRankings: 2, averageRank: 3 });
  });

  it("scales points by each member's own list length", () => {
    const result = computeBordaRankings([
      { userId: "u1", bookId: "A", rank: 1 }, // 1 point (list of 1)
      { userId: "u2", bookId: "B", rank: 1 }, // 3 points (list of 3)
      { userId: "u2", bookId: "C", rank: 2 }, // 2 points
      { userId: "u2", bookId: "A", rank: 3 }, // 1 point
    ]);

    expect(
      Object.fromEntries(result.map((r) => [r.bookId, r.totalPoints]))
    ).toEqual({ A: 2, B: 3, C: 2 });
    expect(result[0].bookId).toBe("B");
  });

  it("ignores unread (null rank) rows and excludes them from N", () => {
    const result = computeBordaRankings([
      { userId: "u1", bookId: "A", rank: 1 },
      { userId: "u1", bookId: "B", rank: null },
      { userId: "u1", bookId: "C", rank: 2 },
    ]);

    expect(result.map((r) => [r.bookId, r.totalPoints])).toEqual([
      ["A", 2],
      ["C", 1],
    ]);
  });

  it("breaks point ties by average rank, then book id", () => {
    // X and Y both 4 points; X has better average rank
    const byAverage = computeBordaRankings([
      { userId: "u1", bookId: "Y", rank: 1 }, // 3
      { userId: "u1", bookId: "Z", rank: 2 },
      { userId: "u1", bookId: "W", rank: 3 }, // 1
      { userId: "u2", bookId: "Y", rank: 3 }, // 1
      { userId: "u2", bookId: "Z", rank: 2 },
      { userId: "u2", bookId: "W", rank: 1 },
      { userId: "u3", bookId: "X", rank: 1 }, // 4 (list of 4)
      { userId: "u3", bookId: "Q1", rank: 2 },
      { userId: "u3", bookId: "Q2", rank: 3 },
      { userId: "u3", bookId: "Q3", rank: 4 },
    ]);
    const x = byAverage.findIndex((r) => r.bookId === "X");
    const y = byAverage.findIndex((r) => r.bookId === "Y");
    expect(byAverage[x].totalPoints).toBe(byAverage[y].totalPoints);
    expect(x).toBeLessThan(y);

    // Identical points and average rank: ordered by id regardless of input
    const rows = [
      { userId: "u1", bookId: "b", rank: 1 },
      { userId: "u2", bookId: "a", rank: 1 },
    ];
    expect(computeBordaRankings(rows).map((r) => r.bookId)).toEqual(["a", "b"]);
    expect(
      computeBordaRankings([...rows].reverse()).map((r) => r.bookId)
    ).toEqual(["a", "b"]);
  });
});
