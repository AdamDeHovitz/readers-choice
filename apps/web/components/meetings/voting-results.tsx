"use client";

import { useState } from "react";
import type {
  EliminationReason,
  TiebreakReason,
} from "@readers-choice/core/voting-algorithm";
import type { VotingResults } from "@/server/voting";

interface VotingResultsDisplayProps {
  results: VotingResults;
  /** Heading for the winner box; finalized meetings may have picked a different book. */
  winnerLabel?: string;
}

function getEliminationReasonText(reason: EliminationReason): string {
  switch (reason) {
    case "lowest_support":
      return "lowest support";
    case "tiebreaker_head_to_head":
      return "worst head-to-head record (tiebreaker)";
    case "tiebreaker_ballot_mentions":
      return "on the fewest ballots (tiebreaker)";
    case "tiebreaker_approval":
      return "fewest approval votes (tiebreaker)";
    case "tiebreaker_random":
      return "random selection (tiebreaker)";
  }
}

function getWinnerTiebreakText(reason: TiebreakReason): string {
  switch (reason) {
    case "tiebreaker_head_to_head":
      return "best head-to-head record";
    case "tiebreaker_ballot_mentions":
      return "on the most ballots";
    case "tiebreaker_approval":
      return "most approval votes";
    case "tiebreaker_random":
      return "random selection";
  }
}

export function VotingResultsDisplay({
  results,
  winnerLabel = "Winner",
}: VotingResultsDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { winner, rounds, voterBreakdown, bookDetails, tallyRules } = results;

  function getBookTitle(bookOptionId: string): string {
    return (
      bookDetails.find((b) => b.bookOptionId === bookOptionId)?.title ||
      "Unknown"
    );
  }

  if (!winner && rounds.length === 0) {
    return (
      <div className="text-dark-500 py-6 text-center">
        <p>No votes have been cast.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Winner announcement */}
      {winner && (
        <div className="bg-rust-50 border-rust-200 rounded-lg border p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h3 className="font-inria text-dark-900 text-lg font-bold">
              {winnerLabel}
            </h3>
          </div>
          <p className="text-dark-900 font-semibold">{winner.bookTitle}</p>
          <p className="text-dark-600 mt-1 text-sm">
            Reached a majority in round {winner.wonInRound} with{" "}
            {winner.finalSupport} {winner.finalSupport === 1 ? "vote" : "votes"}
          </p>
        </div>
      )}

      {/* Voter breakdown */}
      <div className="bg-cream-100 border-border rounded-lg border p-3">
        <p className="text-dark-700 text-sm">
          <span className="font-semibold">{voterBreakdown.totalVoters}</span>{" "}
          {voterBreakdown.totalVoters === 1 ? "member" : "members"} voted
          {voterBreakdown.approvalVoters > 0 &&
            voterBreakdown.rankedVoters > 0 && (
              <span className="text-dark-500">
                {" "}
                ({voterBreakdown.approvalVoters} approval,{" "}
                {voterBreakdown.rankedVoters} ranked choice)
              </span>
            )}
        </p>
      </div>

      {/* Expandable details */}
      <div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sage-700 hover:text-sage-800 flex items-center gap-2 text-sm font-medium"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showDetails ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          How was this calculated?
        </button>

        {showDetails && (
          <div className="mt-3 space-y-4">
            {/* Methodology explanation */}
            <div className="border-border bg-card rounded-lg border p-4">
              <h4 className="font-inria text-dark-900 mb-2 font-semibold">
                Voting Method
              </h4>
              <p className="text-dark-600 mb-3 text-sm">
                This meeting used <strong>Hybrid Instant Runoff Voting</strong>:
              </p>
              <ol className="text-dark-600 list-inside list-decimal space-y-1 text-sm">
                <li>
                  Count support for each book (approval votes + first-choice
                  rankings)
                </li>
                <li>If a book has &gt;50% of active voters, it wins</li>
                <li>Otherwise, eliminate the book with lowest support</li>
                <li>
                  {tallyRules === 1
                    ? "Ties for lowest are broken by fewest approval votes, then at random"
                    : "Ties are broken by head-to-head record across every ballot (how many books each one beats), then by how many ballots include it, then at random"}
                </li>
                <li>
                  Ranked voters whose top choice was eliminated transfer to
                  their next choice
                </li>
                <li>Repeat until a winner emerges</li>
              </ol>
            </div>

            {/* Round-by-round breakdown */}
            <div className="space-y-3">
              <h4 className="font-inria text-dark-900 font-semibold">
                Round-by-Round Results
              </h4>

              {rounds.map((round) => (
                <div
                  key={round.round}
                  className="border-border bg-card rounded-lg border p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h5 className="text-dark-900 text-sm font-semibold">
                      Round {round.round}
                    </h5>
                    <span className="text-dark-500 text-xs">
                      {round.activeVoters} active voters (need{" "}
                      {round.majorityThreshold} for majority)
                    </span>
                  </div>

                  {/* Support table */}
                  <div className="mb-2 space-y-1">
                    {round.bookSupport.map((bs, index) => {
                      const isWinner = round.winner === bs.bookOptionId;
                      const isEliminated =
                        round.eliminated?.bookOptionId === bs.bookOptionId;

                      return (
                        <div
                          key={bs.bookOptionId}
                          className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                            isWinner
                              ? "bg-rust-50 text-rust-800"
                              : isEliminated
                                ? "bg-red-50 text-red-700 line-through"
                                : index === 0
                                  ? "bg-sage-50"
                                  : ""
                          }`}
                        >
                          <span className="flex-1 truncate">
                            {getBookTitle(bs.bookOptionId)}
                          </span>
                          <span className="ml-2 font-mono">
                            {bs.support} {bs.support === 1 ? "vote" : "votes"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Round outcome */}
                  {round.winner ? (
                    <p className="text-rust-700 text-sm font-medium">
                      ✓ {getBookTitle(round.winner)} reached majority!
                      {round.winnerTiebreak && (
                        <span className="text-dark-500 font-normal">
                          {" "}
                          (won a tie for most votes:{" "}
                          {getWinnerTiebreakText(round.winnerTiebreak)})
                        </span>
                      )}
                    </p>
                  ) : round.eliminated ? (
                    <div className="text-dark-600 text-sm">
                      <p>
                        ❌ Eliminated:{" "}
                        <span className="font-medium">
                          {getBookTitle(round.eliminated.bookOptionId)}
                        </span>
                        <span className="text-dark-500">
                          {" "}
                          ({getEliminationReasonText(round.eliminated.reason)})
                        </span>
                      </p>

                      {/* Transfers */}
                      {round.transfers.length > 0 && (
                        <div className="text-dark-500 mt-1 pl-4 text-xs">
                          {round.transfers.map((t, i) => (
                            <p key={i}>
                              {t.count} vote{t.count !== 1 && "s"} transferred
                              to {getBookTitle(t.toBookOptionId)}
                            </p>
                          ))}
                        </div>
                      )}

                      {round.exhaustedVoters > 0 && (
                        <p className="text-dark-500 mt-1 text-xs">
                          {round.exhaustedVoters} voter
                          {round.exhaustedVoters !== 1 && "s"} exhausted (no
                          remaining choices)
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
