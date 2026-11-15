/**
 * Hybrid Instant Runoff Voting Algorithm
 *
 * Combines approval voting and ranked choice voting using IRV-style elimination.
 *
 * Algorithm:
 * 1. Count "support" for each book = approvals + first-choice rankings
 * 2. If any book has support from >50% of non-exhausted voters, it wins
 *    (approval voters can give several books a majority: the most support
 *    wins, and a tie for most is broken as below)
 * 3. Otherwise, eliminate book with lowest support
 *    - Tiebreakers depend on the meeting's TallyRules (see breakTie and
 *      breakTieV1)
 * 4. Transfer ranked voters whose top choice was eliminated to their next choice
 * 5. Approval voters whose book is eliminated lose that support (no transfer)
 * 6. Voters with no remaining approved/ranked books are "exhausted"
 * 7. Repeat until winner or one book remains
 */

export interface ApprovalBallot {
  odId: string;
  approvedBookIds: string[];
}

export interface RankedBallot {
  odId: string;
  rankings: { bookId: string; rank: number }[];
}

/**
 * Which tie-breaking rules a meeting is counted with. A meeting keeps the
 * rules it was voted under, so changing them never rewrites a past result.
 * - 1: ties for last are broken by approval votes (approval ballots only),
 *   then at random; a tie for the most support goes to the first candidate.
 * - 2: ties for last and for the most support are broken by whole ballots
 *   from both pools (see breakTie).
 */
export type TallyRules = 1 | 2;
export const CURRENT_TALLY_RULES: TallyRules = 2;

export type TiebreakReason =
  | "tiebreaker_head_to_head"
  | "tiebreaker_ballot_mentions"
  | "tiebreaker_approval"
  | "tiebreaker_random";

export type EliminationReason = "lowest_support" | TiebreakReason;

export interface EliminationRound {
  round: number;
  bookSupport: {
    bookId: string;
    support: number;
  }[];
  eliminated: {
    bookId: string;
    reason: EliminationReason;
  } | null;
  transfers: {
    fromBookId: string;
    toBookId: string;
    count: number;
  }[];
  exhaustedVoters: number;
  activeVoters: number;
  majorityThreshold: number;
  winner: string | null;
  /** How the winner was chosen among books tied for the most support */
  winnerTiebreak: TiebreakReason | null;
}

export interface VotingResult {
  winner: string | null;
  rounds: EliminationRound[];
  voterBreakdown: {
    approvalVoters: number;
    rankedVoters: number;
    totalVoters: number;
  };
}

/**
 * Run the Hybrid IRV algorithm on the given ballots.
 *
 * @param bookIds - List of all book IDs being voted on
 * @param approvalBallots - Approval voting ballots (each voter approves multiple books)
 * @param rankedBallots - Ranked choice ballots (each voter ranks books in preference order)
 * @param randomSeed - Optional seed for deterministic tiebreaker (for testing)
 * @param rules - Tie-breaking rules; defaults to the current ones
 * @returns VotingResult with winner and round-by-round breakdown
 */
export function runHybridIRV(
  bookIds: string[],
  approvalBallots: ApprovalBallot[],
  rankedBallots: RankedBallot[],
  randomSeed?: number,
  rules: TallyRules = CURRENT_TALLY_RULES
): VotingResult {
  // Position of each candidate; also used to break ties between equal ranks
  const bookOrder = new Map<string, number>();
  for (const bookId of bookIds) {
    if (!bookOrder.has(bookId)) bookOrder.set(bookId, bookOrder.size);
  }

  // Build voter data structures. Votes for books that are not candidates are
  // ignored; a voter left with no candidate votes is exhausted in round 1.
  const approvalByVoter: Map<string, Set<string>> = new Map();
  const rankedByVoter: Map<string, { bookId: string; rank: number }[]> =
    new Map();

  for (const ballot of approvalBallots) {
    approvalByVoter.set(
      ballot.odId,
      new Set(ballot.approvedBookIds.filter((id) => bookOrder.has(id)))
    );
  }

  for (const ballot of rankedBallots) {
    // Sort by rank ascending. Equal ranks are ordered by candidate position so
    // the outcome never depends on the order rows were loaded in.
    const sorted = ballot.rankings
      .filter((r) => bookOrder.has(r.bookId))
      .sort(
        (a, b) =>
          a.rank - b.rank || bookOrder.get(a.bookId)! - bookOrder.get(b.bookId)!
      );
    // A book ranked more than once only counts at its best rank
    const seen = new Set<string>();
    const deduped = sorted.filter((r) => {
      if (seen.has(r.bookId)) return false;
      seen.add(r.bookId);
      return true;
    });
    rankedByVoter.set(ballot.odId, deduped);
  }

  // Whole-ballot preferences used to break ties: every approved book is
  // position 0 (approval voters like them equally), ranked books their index
  const ballots: BallotPositions[] = [
    ...[...approvalByVoter.values()].map(
      (approved) => new Map([...approved].map((bookId) => [bookId, 0]))
    ),
    ...[...rankedByVoter.values()].map(
      (rankings) => new Map(rankings.map((r, i) => [r.bookId, i]))
    ),
  ];

  const approvalVoterCount = approvalByVoter.size;
  const rankedVoterCount = rankedByVoter.size;
  const allVoterIds = new Set([
    ...approvalByVoter.keys(),
    ...rankedByVoter.keys(),
  ]);
  const totalVoters = allVoterIds.size;

  // Track state
  const activeBookIds = new Set(bookOrder.keys());
  const exhaustedVoters = new Set<string>();
  const rounds: EliminationRound[] = [];
  let roundNumber = 0;
  let winner: string | null = null;

  // Seeded random (mulberry32) for deterministic testing. 32-bit integer math
  // via Math.imul keeps every step exact; a plain multiply would overflow the
  // 2^53 range of doubles and lose precision.
  let randomState =
    (randomSeed ?? Math.floor(Math.random() * 0x100000000)) >>> 0;
  function seededRandom(): number {
    randomState = (randomState + 0x6d2b79f5) >>> 0;
    let t = randomState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  while (activeBookIds.size > 1 && !winner) {
    roundNumber++;

    // Calculate support for each active book
    const bookSupport: Map<string, { support: number }> = new Map();
    for (const bookId of activeBookIds) {
      bookSupport.set(bookId, { support: 0 });
    }

    // Count approval votes
    for (const [odId, approvedBooks] of approvalByVoter) {
      if (exhaustedVoters.has(odId)) continue;

      const activeApproved = [...approvedBooks].filter((bid) =>
        activeBookIds.has(bid)
      );
      if (activeApproved.length === 0) {
        exhaustedVoters.add(odId);
        continue;
      }

      // Each active approved book gets +1 support
      for (const bookId of activeApproved) {
        bookSupport.get(bookId)!.support++;
      }
    }

    // Count ranked votes (only top remaining choice gets support)
    for (const [odId, rankings] of rankedByVoter) {
      if (exhaustedVoters.has(odId)) continue;

      const activeRankings = rankings.filter((r) =>
        activeBookIds.has(r.bookId)
      );
      if (activeRankings.length === 0) {
        exhaustedVoters.add(odId);
        continue;
      }

      bookSupport.get(activeRankings[0].bookId)!.support++;
    }

    // Calculate majority threshold (>50% of non-exhausted voters)
    const activeVoters = totalVoters - exhaustedVoters.size;
    const majorityThreshold = Math.floor(activeVoters / 2) + 1;

    // Convert to sorted array
    const supportArray = [...bookSupport.entries()]
      .map(([bookId, s]) => ({
        bookId,
        support: s.support,
      }))
      .sort((a, b) => b.support - a.support);

    const round: EliminationRound = {
      round: roundNumber,
      bookSupport: supportArray,
      eliminated: null,
      transfers: [],
      exhaustedVoters: exhaustedVoters.size,
      activeVoters,
      majorityThreshold,
      winner: null,
      winnerTiebreak: null,
    };

    // Check for winner
    const topSupport = supportArray[0].support;
    if (topSupport >= majorityThreshold) {
      const tiedForTop = supportArray
        .filter((s) => s.support === topSupport)
        .map((s) => s.bookId);
      if (tiedForTop.length === 1 || rules === 1) {
        winner = tiedForTop[0];
      } else {
        const pick = breakTie(tiedForTop, ballots, seededRandom, "strongest");
        winner = pick.bookId;
        round.winnerTiebreak = pick.reason;
      }
      round.winner = winner;
      rounds.push(round);
      break;
    }

    // No majority - eliminate lowest support book
    const lowestSupport = supportArray[supportArray.length - 1].support;
    const tiedForLowest = supportArray
      .filter((s) => s.support === lowestSupport)
      .map((s) => s.bookId);
    const { bookId: toEliminate, reason: eliminationReason } =
      tiedForLowest.length === 1
        ? { bookId: tiedForLowest[0], reason: "lowest_support" as const }
        : rules === 1
          ? breakTieV1(tiedForLowest, approvalByVoter, seededRandom)
          : breakTie(tiedForLowest, ballots, seededRandom, "weakest");

    // Record transfers from ranked voters
    const transfers: Map<string, number> = new Map();
    for (const [odId, rankings] of rankedByVoter) {
      if (exhaustedVoters.has(odId)) continue;

      const activeRankings = rankings.filter((r) =>
        activeBookIds.has(r.bookId)
      );
      if (
        activeRankings.length > 0 &&
        activeRankings[0].bookId === toEliminate
      ) {
        // Find next choice (excluding the eliminated book)
        const nextChoice = activeRankings.find(
          (r) => r.bookId !== toEliminate && activeBookIds.has(r.bookId)
        );
        if (nextChoice) {
          const key = nextChoice.bookId;
          transfers.set(key, (transfers.get(key) || 0) + 1);
        }
      }
    }

    round.eliminated = { bookId: toEliminate, reason: eliminationReason };
    round.transfers = [...transfers.entries()].map(([toBookId, count]) => ({
      fromBookId: toEliminate,
      toBookId,
      count,
    }));
    rounds.push(round);

    // Remove eliminated book
    activeBookIds.delete(toEliminate);
  }

  // If only one book left, it wins by default
  if (!winner && activeBookIds.size === 1) {
    winner = [...activeBookIds][0];
    if (rounds.length > 0 && !rounds[rounds.length - 1].winner) {
      rounds[rounds.length - 1].winner = winner;
    }
  }

  return {
    winner,
    rounds,
    voterBreakdown: {
      approvalVoters: approvalVoterCount,
      rankedVoters: rankedVoterCount,
      totalVoters,
    },
  };
}

/** A voter's books by preference position (lower is better); absent = unlisted. */
type BallotPositions = Map<string, number>;

/** Whether a ballot prefers book a to book b. Any listed book beats an unlisted one. */
function prefers(ballot: BallotPositions, a: string, b: string): boolean {
  const pa = ballot.get(a);
  if (pa === undefined) return false;
  const pb = ballot.get(b);
  return pb === undefined || pa < pb;
}

/**
 * Choose the weakest (to eliminate) or strongest (to elect) of books tied on
 * support, looking at whole ballots from both pools rather than the round's
 * support counts:
 * 1. Head-to-head record against the other tied books: matchups won minus
 *    matchups lost, where a matchup is won when more voters prefer the book.
 * 2. Number of ballots the book is on (approved, or ranked anywhere).
 * 3. Random, among books still tied.
 * Ties are kept in candidate order so the seeded draw is reproducible.
 */
function breakTie(
  tied: string[],
  ballots: BallotPositions[],
  random: () => number,
  pick: "weakest" | "strongest"
): { bookId: string; reason: TiebreakReason } {
  const sign = pick === "strongest" ? 1 : -1;
  const best = (scores: number[]) => {
    const target = Math.max(...scores.map((x) => sign * x));
    return tied.filter((_, i) => sign * scores[i] === target);
  };

  const records = tied.map((a) =>
    tied.reduce((record, b) => {
      if (a === b) return record;
      const forA = ballots.filter((v) => prefers(v, a, b)).length;
      const forB = ballots.filter((v) => prefers(v, b, a)).length;
      return record + Math.sign(forA - forB);
    }, 0)
  );
  const byHeadToHead = best(records);
  if (byHeadToHead.length === 1) {
    return { bookId: byHeadToHead[0], reason: "tiebreaker_head_to_head" };
  }

  const mentions = tied.map((bookId) =>
    byHeadToHead.includes(bookId)
      ? ballots.filter((v) => v.has(bookId)).length
      : // Out of the running: never best in either direction
        -sign * Infinity
  );
  const byMentions = best(mentions);
  if (byMentions.length === 1) {
    return { bookId: byMentions[0], reason: "tiebreaker_ballot_mentions" };
  }

  return {
    bookId: byMentions[Math.floor(random() * byMentions.length)],
    reason: "tiebreaker_random",
  };
}

/**
 * Rules 1: eliminate the tied book with the fewest approvals on approval
 * ballots, then at random. (These rules also had a "fewest first-choice
 * votes" step, but that count always equalled support, so it never decided.)
 */
function breakTieV1(
  tied: string[],
  approvalByVoter: Map<string, Set<string>>,
  random: () => number
): { bookId: string; reason: TiebreakReason } {
  const approvals = tied.map(
    (bookId) =>
      [...approvalByVoter.values()].filter((approved) => approved.has(bookId))
        .length
  );
  const fewest = Math.min(...approvals);
  const byApproval = tied.filter((_, i) => approvals[i] === fewest);
  if (byApproval.length === 1) {
    return { bookId: byApproval[0], reason: "tiebreaker_approval" };
  }
  return {
    bookId: byApproval[Math.floor(random() * byApproval.length)],
    reason: "tiebreaker_random",
  };
}
