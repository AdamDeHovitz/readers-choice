import { describe, it, expect } from "vitest";
import {
  isContiguousRanking,
  isVotingClosed,
  validateRankedBallot,
  validateYearRankings,
} from "./ballot-validation";

describe("isContiguousRanking", () => {
  it("accepts 1..N in any order and the empty ranking", () => {
    expect(isContiguousRanking([])).toBe(true);
    expect(isContiguousRanking([1])).toBe(true);
    expect(isContiguousRanking([3, 1, 2])).toBe(true);
  });

  it("rejects gaps, duplicates, zero, negatives and non-integers", () => {
    expect(isContiguousRanking([1, 3])).toBe(false);
    expect(isContiguousRanking([1, 1])).toBe(false);
    expect(isContiguousRanking([0, 1])).toBe(false);
    expect(isContiguousRanking([-1])).toBe(false);
    expect(isContiguousRanking([1.5])).toBe(false);
    expect(isContiguousRanking([2])).toBe(false);
  });
});

describe("validateRankedBallot", () => {
  const options = new Set(["o1", "o2", "o3"]);

  it("accepts a valid partial or full ballot", () => {
    expect(validateRankedBallot([], options).ok).toBe(true);
    expect(
      validateRankedBallot(
        [
          { bookOptionId: "o2", rank: 1 },
          { bookOptionId: "o1", rank: 2 },
        ],
        options
      ).ok
    ).toBe(true);
  });

  it("rejects options from another meeting", () => {
    const result = validateRankedBallot(
      [{ bookOptionId: "other", rank: 1 }],
      options
    );
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate options", () => {
    expect(
      validateRankedBallot(
        [
          { bookOptionId: "o1", rank: 1 },
          { bookOptionId: "o1", rank: 2 },
        ],
        options
      ).ok
    ).toBe(false);
  });

  it("rejects duplicate or non-contiguous ranks", () => {
    expect(
      validateRankedBallot(
        [
          { bookOptionId: "o1", rank: 1 },
          { bookOptionId: "o2", rank: 1 },
        ],
        options
      ).ok
    ).toBe(false);
    expect(
      validateRankedBallot([{ bookOptionId: "o1", rank: 2 }], options).ok
    ).toBe(false);
  });
});

describe("validateYearRankings", () => {
  const yearBooks = new Set(["b1", "b2", "b3"]);

  it("accepts ranked plus unread books from the year", () => {
    expect(
      validateYearRankings(
        [
          { bookId: "b2", rank: 1 },
          { bookId: "b1", rank: 2 },
        ],
        ["b3"],
        yearBooks
      ).ok
    ).toBe(true);
    expect(validateYearRankings([], [], yearBooks).ok).toBe(true);
  });

  it("rejects a book that is both ranked and unread", () => {
    const result = validateYearRankings(
      [{ bookId: "b1", rank: 1 }],
      ["b1"],
      yearBooks
    );
    expect(result).toEqual({
      ok: false,
      error: "A book cannot be both ranked and marked as not read",
    });
  });

  it("rejects books that were not finalized picks that year", () => {
    expect(
      validateYearRankings([{ bookId: "x", rank: 1 }], [], yearBooks).ok
    ).toBe(false);
    expect(validateYearRankings([], ["x"], yearBooks).ok).toBe(false);
  });

  it("rejects duplicates and bad ranks", () => {
    expect(
      validateYearRankings(
        [
          { bookId: "b1", rank: 1 },
          { bookId: "b1", rank: 2 },
        ],
        [],
        yearBooks
      ).ok
    ).toBe(false);
    expect(validateYearRankings([], ["b1", "b1"], yearBooks).ok).toBe(false);
    expect(
      validateYearRankings(
        [
          { bookId: "b1", rank: 1 },
          { bookId: "b2", rank: 3 },
        ],
        [],
        yearBooks
      ).ok
    ).toBe(false);
  });
});

describe("isVotingClosed", () => {
  const now = new Date("2026-05-01T12:00:00Z");

  it("is closed once finalized", () => {
    expect(
      isVotingClosed({ is_finalized: true, voting_deadline: null }, now)
    ).toBe(true);
  });

  it("is open with no deadline", () => {
    expect(
      isVotingClosed({ is_finalized: false, voting_deadline: null }, now)
    ).toBe(false);
  });

  it("is open up to and including the deadline, closed after", () => {
    expect(
      isVotingClosed(
        { is_finalized: false, voting_deadline: "2026-05-01T12:00:00Z" },
        now
      )
    ).toBe(false);
    expect(
      isVotingClosed(
        { is_finalized: false, voting_deadline: "2026-05-01T11:59:59Z" },
        now
      )
    ).toBe(true);
  });
});
