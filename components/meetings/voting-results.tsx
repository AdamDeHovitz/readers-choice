"use client";

import { useState } from "react";
import type {
  VotingResults,
  EliminationRound,
} from "@/app/actions/meeting-voting";

interface VotingResultsDisplayProps {
  results: VotingResults;
}

function getEliminationReasonText(
  reason:
    | "lowest_support"
    | "tiebreaker_first_choice"
    | "tiebreaker_approval"
    | "tiebreaker_random"
): string {
  switch (reason) {
    case "lowest_support":
      return "lowest support";
    case "tiebreaker_first_choice":
      return "fewest first-choice votes (tiebreaker)";
    case "tiebreaker_approval":
      return "fewest approval votes (tiebreaker)";
    case "tiebreaker_random":
      return "random selection (tiebreaker)";
    default:
      return "eliminated";
  }
}

export function VotingResultsDisplay({ results }: VotingResultsDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { winner, rounds, voterBreakdown, bookDetails } = results;

  function getBookTitle(bookOptionId: string): string {
    return (
      bookDetails.find((b) => b.bookOptionId === bookOptionId)?.title ||
      "Unknown"
    );
  }

  if (!winner && rounds.length === 0) {
    return (
      <div className="text-dark-500 py-6 text-center">
        <p>No votes have been cast yet.</p>
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
              Winner
            </h3>
          </div>
          <p className="text-dark-800 font-semibold">{winner.bookTitle}</p>
          <p className="text-dark-600 mt-1 text-sm">
            Won in round {winner.wonInRound} with {winner.finalSupport} votes
          </p>
        </div>
      )}

      {/* Voter breakdown */}
      <div className="bg-cream-100 border-gold-600/20 rounded-lg border p-3">
        <p className="text-dark-700 text-sm">
          <span className="font-semibold">{voterBreakdown.totalVoters}</span>{" "}
          members voted
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
          className="text-gold-700 hover:text-gold-800 flex items-center gap-2 text-sm font-medium"
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
            <div className="border-gold-600/20 rounded-lg border bg-white p-4">
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
                  className="border-gold-600/20 rounded-lg border bg-white p-3"
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
                              ? "bg-rust-50 text-rust-900"
                              : isEliminated
                                ? "bg-red-50 text-red-700 line-through"
                                : index === 0
                                  ? "bg-gold-50"
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
