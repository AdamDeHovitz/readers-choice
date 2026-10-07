import { describe, it, expect } from "vitest";
import { buildMeetingBallots, seedFromString } from "./meeting-ballots";
import { runHybridIRV } from "./voting-algorithm";

describe("buildMeetingBallots", () => {
  const memberIds = new Set(["u1", "u2", "u3"]);

  it("drops votes from users who are no longer members", () => {
    const { approvalBallots, rankedBallots } = buildMeetingBallots({
      approvalVotes: [
        { user_id: "u1", book_option_id: "A" },
        { user_id: "gone", book_option_id: "B" },
      ],
      rankedVotes: [{ user_id: "gone", book_option_id: "B", rank: 1 }],
      preferences: [{ user_id: "gone", voting_method: "ranked" }],
      memberIds,
    });

    expect(approvalBallots).toEqual([{ odId: "u1", approvedBookIds: ["A"] }]);
    expect(rankedBallots).toEqual([]);
  });

  it("counts each user in exactly one pool, chosen by preference", () => {
    const { approvalBallots, rankedBallots } = buildMeetingBallots({
      approvalVotes: [
        { user_id: "u1", book_option_id: "A" },
        { user_id: "u2", book_option_id: "B" },
      ],
      rankedVotes: [
        { user_id: "u1", book_option_id: "B", rank: 1 },
        { user_id: "u2", book_option_id: "A", rank: 1 },
      ],
      preferences: [
        { user_id: "u1", voting_method: "ranked" },
        { user_id: "u2", voting_method: "approval" },
      ],
      memberIds,
    });

    expect(approvalBallots.map((b) => b.odId)).toEqual(["u2"]);
    expect(rankedBallots.map((b) => b.odId)).toEqual(["u1"]);
  });

  it("without a preference, uses ranked votes if present, else approval", () => {
    const { approvalBallots, rankedBallots } = buildMeetingBallots({
      approvalVotes: [
        { user_id: "u1", book_option_id: "A" },
        { user_id: "u2", book_option_id: "A" },
      ],
      rankedVotes: [
        { user_id: "u2", book_option_id: "B", rank: 2 },
        { user_id: "u2", book_option_id: "A", rank: 1 },
      ],
      preferences: [],
      memberIds,
    });

    expect(approvalBallots.map((b) => b.odId)).toEqual(["u1"]);
    expect(rankedBallots).toEqual([
      {
        odId: "u2",
        rankings: [
          { bookId: "A", rank: 1 },
          { bookId: "B", rank: 2 },
        ],
      },
    ]);
  });
});

describe("seedFromString", () => {
  it("is stable and in the 31-bit range", () => {
    const seed = seedFromString("4b0c1c5e-7f61-4c1e-9d5b-0f0e5b8b2a11");
    expect(seed).toBe(seedFromString("4b0c1c5e-7f61-4c1e-9d5b-0f0e5b8b2a11"));
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2147483648);
    expect(seedFromString("a")).not.toBe(seedFromString("b"));
  });

  it("makes a fully tied election resolve the same way every time", () => {
    const books = ["A", "B", "C", "D"];
    const ballots = books.map((b, i) => ({
      odId: `v${i}`,
      approvedBookIds: [b],
    }));
    const seed = seedFromString("meeting-1");
    const first = runHybridIRV(books, ballots, [], seed);
    for (let i = 0; i < 5; i++) {
      expect(runHybridIRV(books, ballots, [], seed)).toEqual(first);
    }
    expect(first.winner).not.toBeNull();
  });
});
