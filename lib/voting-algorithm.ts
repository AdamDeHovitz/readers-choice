/**
 * Hybrid Instant Runoff Voting Algorithm
 *
 * Combines approval voting and ranked choice voting using IRV-style elimination.
 *
 * Algorithm:
 * 1. Count "support" for each book = approvals + first-choice rankings
 * 2. If any book has support from >50% of non-exhausted voters, it wins
 * 3. Otherwise, eliminate book with lowest support
 *    - Tiebreaker: fewest first-choice votes → fewest approvals → random
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

export interface EliminationRound {
  round: number;
  bookSupport: {
    bookId: string;
    support: number;
    firstChoiceVotes: number;
  }[];
  eliminated: {
    bookId: string;
    reason:
      | "lowest_support"
      | "tiebreaker_first_choice"
      | "tiebreaker_approval"
      | "tiebreaker_random";
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
 * @returns VotingResult with winner and round-by-round breakdown
 */
export function runHybridIRV(
  bookIds: string[],
  approvalBallots: ApprovalBallot[],
  rankedBallots: RankedBallot[],
  randomSeed?: number
): VotingResult {
  // Build voter data structures
  const approvalByVoter: Map<string, Set<string>> = new Map();
  const rankedByVoter: Map<string, { bookId: string; rank: number }[]> =
    new Map();

  for (const ballot of approvalBallots) {
    approvalByVoter.set(ballot.odId, new Set(ballot.approvedBookIds));
  }

  for (const ballot of rankedBallots) {
    // Sort by rank ascending
    const sorted = [...ballot.rankings].sort((a, b) => a.rank - b.rank);
    rankedByVoter.set(ballot.odId, sorted);
  }

  const approvalVoterCount = approvalByVoter.size;
  const rankedVoterCount = rankedByVoter.size;
  const allVoterIds = new Set([
    ...approvalByVoter.keys(),
    ...rankedByVoter.keys(),
  ]);
  const totalVoters = allVoterIds.size;

  // Track state
  const activeBookIds = new Set(bookIds);
  const exhaustedVoters = new Set<string>();
  const rounds: EliminationRound[] = [];
  let roundNumber = 0;
  let winner: string | null = null;

  // Seeded random for deterministic testing
  let randomState = randomSeed ?? Math.random() * 1000000;
  function seededRandom(): number {
    randomState = (randomState * 1103515245 + 12345) % 2147483648;
    return randomState / 2147483648;
  }

  while (activeBookIds.size > 1 && !winner) {
    roundNumber++;

    // Calculate support for each active book
    const bookSupport: Map<
      string,
      { support: number; firstChoiceVotes: number }
    > = new Map();
    for (const bookId of activeBookIds) {
      bookSupport.set(bookId, { support: 0, firstChoiceVotes: 0 });
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

      // Each active approved book gets +1 support and +1 first choice
      for (const bookId of activeApproved) {
        const current = bookSupport.get(bookId)!;
        current.support++;
        current.firstChoiceVotes++;
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

      const topChoice = activeRankings[0].bookId;
      const current = bookSupport.get(topChoice)!;
      current.support++;
      current.firstChoiceVotes++;
    }

    // Calculate majority threshold (>50% of non-exhausted voters)
    const activeVoters = totalVoters - exhaustedVoters.size;
    const majorityThreshold = Math.floor(activeVoters / 2) + 1;

    // Convert to sorted array
    const supportArray = [...bookSupport.entries()]
      .map(([bookId, s]) => ({
        bookId,
        support: s.support,
        firstChoiceVotes: s.firstChoiceVotes,
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
    };

    // Check for winner
    if (supportArray[0].support >= majorityThreshold) {
      winner = supportArray[0].bookId;
      round.winner = winner;
      rounds.push(round);
      break;
    }

    // No majority - eliminate lowest support book
    const lowestSupport = supportArray[supportArray.length - 1].support;
    const tiedForLowest = supportArray.filter(
      (s) => s.support === lowestSupport
    );

    let toEliminate: string;
    let eliminationReason:
      | "lowest_support"
      | "tiebreaker_first_choice"
      | "tiebreaker_approval"
      | "tiebreaker_random" = "lowest_support";

    if (tiedForLowest.length === 1) {
      toEliminate = tiedForLowest[0].bookId;
    } else {
      // Tiebreaker 1: Fewest first-choice votes
      const minFirstChoice = Math.min(
        ...tiedForLowest.map((t) => t.firstChoiceVotes)
      );
      const tiedByFirstChoice = tiedForLowest.filter(
        (t) => t.firstChoiceVotes === minFirstChoice
      );

      if (tiedByFirstChoice.length === 1) {
        toEliminate = tiedByFirstChoice[0].bookId;
        eliminationReason = "tiebreaker_first_choice";
      } else {
        // Tiebreaker 2: Fewest total approval votes (from original ballots)
        const approvalCounts: Map<string, number> = new Map();
        for (const t of tiedByFirstChoice) {
          approvalCounts.set(t.bookId, 0);
        }

        for (const approvedBooks of approvalByVoter.values()) {
          for (const bookId of approvedBooks) {
            if (approvalCounts.has(bookId)) {
              approvalCounts.set(bookId, approvalCounts.get(bookId)! + 1);
            }
          }
        }

        const minApproval = Math.min(...approvalCounts.values());
        const tiedByApproval = tiedByFirstChoice.filter(
          (t) => approvalCounts.get(t.bookId) === minApproval
        );

        if (tiedByApproval.length === 1) {
          toEliminate = tiedByApproval[0].bookId;
          eliminationReason = "tiebreaker_approval";
        } else {
          // Tiebreaker 3: Random (or seeded random for testing)
          const randomIndex = Math.floor(
            seededRandom() * tiedByApproval.length
          );
          toEliminate = tiedByApproval[randomIndex].bookId;
          eliminationReason = "tiebreaker_random";
        }
      }
    }

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
