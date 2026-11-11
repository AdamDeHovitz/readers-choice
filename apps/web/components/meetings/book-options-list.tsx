"use client";

import { useState, type ReactNode } from "react";
import { finalizeMeeting } from "@/app/actions/meetings";
import { voteForBook } from "@/app/actions/meeting-voting";
import { useAction } from "@/hooks/use-action";
import type { VotingResults } from "@/server/voting";
import { EmptyState } from "@/components/ui/empty-state";
import { VotingMethodToggle } from "./voting-method-toggle";
import { MeetingRankedVoting } from "./meeting-ranked-voting";
import { VotingResultsDisplay } from "./voting-results";
import { AdminFinalizeSection } from "./admin-finalize-section";
import { BookOptionCard } from "./book-option-card";
import { FinalizedVotingResults } from "./finalized-voting-results";
import type { MeetingBookOptionWithVotes } from "@/server/meetings";

interface BookOptionsListProps {
  bookOptions: MeetingBookOptionWithVotes[];
  isFinalized: boolean;
  selectedBookId: string | null;
  currentUserIsAdmin: boolean;
  meetingId: string;
  isVotingOpen: boolean;
  userVotingMethod: "approval" | "ranked" | null;
  userRankedVotes: { bookOptionId: string; rank: number }[];
  /** Hybrid IRV results once voting has closed (before finalization). */
  votingResults: VotingResults | null;
  /** Server-rendered library availability, keyed by book option id. */
  availability?: Record<string, ReactNode>;
}

export function BookOptionsList({
  bookOptions,
  isFinalized,
  selectedBookId,
  currentUserIsAdmin,
  meetingId,
  isVotingOpen,
  userVotingMethod,
  userRankedVotes,
  votingResults,
  availability,
}: BookOptionsListProps) {
  const vote = useAction(voteForBook);
  const finalize = useAction(finalizeMeeting);
  // Which option/book the in-flight request is for, to show its spinner.
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<string | null>(null);
  const votingForId = vote.pending ? voteTarget : null;
  const finalizingBookId = finalize.pending ? finalizeTarget : null;
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );

  // Determine if we should show vote counts
  // Only show when voting is closed (finalized or past voting deadline)
  const showVoteCounts = isFinalized || !isVotingOpen;

  // Determine if user can vote
  const canVote = isVotingOpen && !isFinalized;

  // Determine current voting method (default to approval if not set)
  const currentMethod = userVotingMethod || "approval";

  if (bookOptions.length === 0) {
    return (
      <EmptyState
        title="No books nominated"
        description="Nothing was nominated for this meeting."
      />
    );
  }

  async function handleVote(bookOptionId: string) {
    setVoteTarget(bookOptionId);
    const result = await vote.run(bookOptionId);
    if (!result.success) alert(result.error);
  }

  async function handleFinalize(bookId: string) {
    if (
      !confirm(
        "Are you sure you want to finalize this meeting? This will close voting."
      )
    ) {
      return;
    }

    setFinalizeTarget(bookId);
    const result = await finalize.run(meetingId, bookId);
    if (!result.success) alert(result.error);
  }

  function toggleDescription(bookId: string) {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  }

  // Finalized: selected book first (full results live in the dropdown).
  // Voting closed: highest approval count first.
  const sortedOptions = isFinalized
    ? [...bookOptions].sort(
        (a, b) =>
          Number(b.book.id === selectedBookId) -
          Number(a.book.id === selectedBookId)
      )
    : showVoteCounts
      ? [...bookOptions].sort((a, b) => b.voteCount - a.voteCount)
      : bookOptions;

  // Render ranked choice voting interface
  if (canVote && currentMethod === "ranked") {
    return (
      <div className="space-y-4">
        {/* Voting method toggle */}
        <div className="flex justify-end">
          <VotingMethodToggle
            meetingId={meetingId}
            currentMethod={currentMethod}
            disabled={!canVote}
          />
        </div>

        {/* Ranked choice interface */}
        <MeetingRankedVoting
          meetingId={meetingId}
          bookOptions={bookOptions}
          initialRankings={userRankedVotes}
          currentUserIsAdmin={currentUserIsAdmin}
        />

        {availability && (
          <section
            aria-labelledby="ranked-availability-heading"
            className="border-border bg-card rounded-2xl border p-4"
          >
            <h3
              id="ranked-availability-heading"
              className="font-inria text-dark-900 mb-3 text-sm font-bold"
            >
              Library availability
            </h3>
            <ul className="divide-sage-600/15 divide-y">
              {bookOptions.map((option) => (
                <li
                  key={option.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                >
                  <span className="font-inria text-dark-900 min-w-0 text-sm">
                    {option.book.title}
                  </span>
                  {availability[option.id]}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Admin finalize section */}
        {currentUserIsAdmin && (
          <AdminFinalizeSection
            bookOptions={bookOptions}
            finalizingBookId={finalizingBookId}
            onFinalize={handleFinalize}
          />
        )}
      </div>
    );
  }

  // Render voting results after voting closes (but not finalized)
  if (showVoteCounts && !isFinalized && votingResults) {
    return (
      <div className="space-y-4">
        <VotingResultsDisplay results={votingResults} />

        {/* Admin finalize section */}
        {currentUserIsAdmin && (
          <AdminFinalizeSection
            bookOptions={bookOptions}
            finalizingBookId={finalizingBookId}
            onFinalize={handleFinalize}
          />
        )}
      </div>
    );
  }

  // Render approval voting interface (default) or finalized view
  return (
    <div className="space-y-4">
      {/* Voting method toggle - only show during active voting */}
      {canVote && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Vote for every book you&apos;d read. Counts stay hidden until voting
            closes.
          </p>
          <VotingMethodToggle
            meetingId={meetingId}
            currentMethod={currentMethod}
            disabled={!canVote}
          />
        </div>
      )}

      {sortedOptions.map((option, index) => (
        <BookOptionCard
          key={option.id}
          option={option}
          index={index}
          isFinalized={isFinalized}
          isWinner={isFinalized && option.book.id === selectedBookId}
          // Per-card counts are approval-only; finalized meetings show the
          // full hybrid results in FinalizedVotingResults instead.
          showVoteCounts={showVoteCounts && !isFinalized}
          canVote={canVote}
          isApprovalVoting={currentMethod === "approval"}
          currentUserIsAdmin={currentUserIsAdmin}
          isVoting={votingForId === option.id}
          isFinalizing={finalizingBookId === option.book.id}
          isExpanded={expandedDescriptions.has(option.id)}
          onToggleDescription={toggleDescription}
          onVote={handleVote}
          onFinalize={handleFinalize}
          availability={availability?.[option.id]}
        />
      ))}

      {isFinalized && <FinalizedVotingResults meetingId={meetingId} />}
    </div>
  );
}
