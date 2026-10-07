"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { voteForBook, finalizeMeeting } from "@/app/actions/meetings";
import {
  calculateMeetingResults,
  type VotingResults,
} from "@/app/actions/meeting-voting";
import { VotingMethodToggle } from "./voting-method-toggle";
import { MeetingRankedVoting } from "./meeting-ranked-voting";
import { VotingResultsDisplay } from "./voting-results";
import { AdminFinalizeSection } from "./admin-finalize-section";
import { BookOptionCard } from "./book-option-card";
import type { MeetingBookOptionWithVotes } from "./types";

interface BookOptionsListProps {
  bookOptions: MeetingBookOptionWithVotes[];
  isFinalized: boolean;
  selectedBookId: string | null;
  currentUserIsAdmin: boolean;
  meetingId: string;
  isVotingOpen: boolean;
  userVotingMethod: "approval" | "ranked" | null;
  userRankedVotes: { bookOptionId: string; rank: number }[];
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
}: BookOptionsListProps) {
  const router = useRouter();
  const [votingForId, setVotingForId] = useState<string | null>(null);
  const [finalizingBookId, setFinalizingBookId] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );
  const [votingResults, setVotingResults] = useState<VotingResults | null>(
    null
  );
  const [loadingResults, setLoadingResults] = useState(false);

  // Determine if we should show vote counts
  // Only show when voting is closed (finalized or past voting deadline)
  const showVoteCounts = isFinalized || !isVotingOpen;

  // Determine if user can vote
  const canVote = isVotingOpen && !isFinalized;

  // Determine current voting method (default to approval if not set)
  const currentMethod = userVotingMethod || "approval";

  // Check if user has existing votes
  const hasExistingVotes =
    (currentMethod === "approval" && bookOptions.some((o) => o.userHasVoted)) ||
    (currentMethod === "ranked" && userRankedVotes.length > 0);

  // Load voting results when voting is closed
  useEffect(() => {
    if (showVoteCounts && !isFinalized && !votingResults) {
      setLoadingResults(true);
      calculateMeetingResults(meetingId).then((results) => {
        setVotingResults(results);
        setLoadingResults(false);
      });
    }
  }, [showVoteCounts, isFinalized, meetingId, votingResults]);

  if (bookOptions.length === 0) {
    return (
      <p className="text-dark-500 py-8 text-center italic">
        No book options added yet
      </p>
    );
  }

  async function handleVote(bookOptionId: string) {
    setVotingForId(bookOptionId);
    await voteForBook(bookOptionId);
    setVotingForId(null);
    router.refresh();
  }

  async function handleFinalize(bookId: string) {
    if (
      !confirm(
        "Are you sure you want to finalize this meeting? This will close voting."
      )
    ) {
      return;
    }

    setFinalizingBookId(bookId);
    const result = await finalizeMeeting(meetingId, bookId);
    if (result.error) {
      alert(result.error);
    }
    setFinalizingBookId(null);
    router.refresh();
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

  // Sort by vote count (highest first) - only when showing counts
  const sortedOptions = showVoteCounts
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
            hasExistingVotes={hasExistingVotes}
          />
        </div>

        {/* Ranked choice interface */}
        <MeetingRankedVoting
          meetingId={meetingId}
          bookOptions={bookOptions}
          initialRankings={userRankedVotes}
          currentUserIsAdmin={currentUserIsAdmin}
        />

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

  // Loading results state
  if (showVoteCounts && !isFinalized && loadingResults) {
    return (
      <div className="py-8 text-center">
        <p className="text-dark-500">Calculating results...</p>
      </div>
    );
  }

  // Render approval voting interface (default) or finalized view
  return (
    <div className="space-y-4">
      {/* Voting method toggle - only show during active voting */}
      {canVote && (
        <div className="flex justify-end">
          <VotingMethodToggle
            meetingId={meetingId}
            currentMethod={currentMethod}
            disabled={!canVote}
            hasExistingVotes={hasExistingVotes}
          />
        </div>
      )}

      {/* Hidden votes notice */}
      {canVote && (
        <div className="bg-cream-100 border-gold-600/20 rounded-lg border p-3 text-center">
          <p className="text-dark-600 text-sm">
            Vote counts are hidden until voting closes
          </p>
        </div>
      )}

      {sortedOptions.map((option, index) => (
        <BookOptionCard
          key={option.id}
          option={option}
          index={index}
          isFinalized={isFinalized}
          isWinner={isFinalized && option.book.id === selectedBookId}
          showVoteCounts={showVoteCounts}
          canVote={canVote}
          isApprovalVoting={currentMethod === "approval"}
          currentUserIsAdmin={currentUserIsAdmin}
          isVoting={votingForId === option.id}
          isFinalizing={finalizingBookId === option.book.id}
          isExpanded={expandedDescriptions.has(option.id)}
          onToggleDescription={toggleDescription}
          onVote={handleVote}
          onFinalize={handleFinalize}
        />
      ))}
    </div>
  );
}
