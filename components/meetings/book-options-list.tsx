"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { voteForBook, finalizeMeeting } from "@/app/actions/meetings";
import {
  calculateMeetingResults,
  type VotingResults,
} from "@/app/actions/meeting-voting";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VotingMethodToggle } from "./voting-method-toggle";
import { MeetingRankedVoting } from "./meeting-ranked-voting";
import { VotingResultsDisplay } from "./voting-results";
import Image from "next/image";
import { sanitizeDescription } from "@/lib/sanitize-description";

interface BookOption {
  id: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    description: string | null;
    publishedYear: number | null;
  };
  voteCount: number;
  userHasVoted: boolean;
}

interface BookOptionsListProps {
  bookOptions: BookOption[];
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
    if (showVoteCounts && !votingResults) {
      setLoadingResults(true);
      calculateMeetingResults(meetingId).then((results) => {
        setVotingResults(results);
        setLoadingResults(false);
      });
    }
  }, [showVoteCounts, meetingId, votingResults]);

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
        />

        {/* Admin finalize section */}
        {currentUserIsAdmin && (
          <div className="border-gold-600/20 mt-4 border-t pt-4">
            <p className="text-dark-600 mb-2 text-sm">
              Admin: Select winning book to finalize
            </p>
            <div className="flex flex-wrap gap-2">
              {bookOptions.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleFinalize(option.book.id)}
                  disabled={finalizingBookId === option.book.id}
                >
                  {finalizingBookId === option.book.id
                    ? "..."
                    : option.book.title}
                </Button>
              ))}
            </div>
          </div>
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
          <div className="border-gold-600/20 mt-4 border-t pt-4">
            <p className="text-dark-600 mb-2 text-sm">
              Admin: Select winning book to finalize
            </p>
            <div className="flex flex-wrap gap-2">
              {bookOptions.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleFinalize(option.book.id)}
                  disabled={finalizingBookId === option.book.id}
                >
                  {finalizingBookId === option.book.id
                    ? "..."
                    : option.book.title}
                </Button>
              ))}
            </div>
          </div>
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

      {/* Ranked choice results after finalization */}
      {isFinalized && votingResults && (
        <VotingResultsDisplay results={votingResults} />
      )}

      {isFinalized && loadingResults && !votingResults && (
        <div className="py-6 text-center">
          <p className="text-dark-500">Calculating results...</p>
        </div>
      )}

      {sortedOptions.map((option, index) => {
        const isWinner = isFinalized && option.book.id === selectedBookId;
        const isVoting = votingForId === option.id;
        const isFinalizing = finalizingBookId === option.book.id;
        const isExpanded = expandedDescriptions.has(option.book.id);
        const hasLongDescription =
          option.book.description && option.book.description.length > 150;

        return (
          <Card
            key={option.id}
            className={`${isWinner ? "bg-rust-50 ring-2 ring-green-500" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Rank Badge - only show when votes are visible and not finalized */}
                {showVoteCounts && !isFinalized && (
                  <div className="flex-shrink-0">
                    <div
                      className={`font-inria flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-900"
                          : "bg-cream-200 text-dark-600"
                      }`}
                    >
                      #{index + 1}
                    </div>
                  </div>
                )}

                {/* Book Cover */}
                <div className="flex-shrink-0">
                  {option.book.coverUrl ? (
                    <Image
                      src={option.book.coverUrl}
                      alt={option.book.title}
                      width={80}
                      height={120}
                      className="h-30 w-20 rounded object-cover shadow-md"
                    />
                  ) : (
                    <div className="bg-cream-200 flex h-30 w-20 items-center justify-center rounded">
                      <svg
                        className="text-dark-500 h-10 w-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-inria text-dark-900 mb-1 font-semibold">
                        {option.book.title}
                      </h3>
                      <p className="text-dark-600 mb-1 text-sm">
                        by {option.book.author}
                      </p>
                      {option.book.publishedYear && (
                        <p className="text-dark-500 text-xs">
                          Published {option.book.publishedYear}
                        </p>
                      )}
                    </div>

                    {isWinner && (
                      <span className="bg-rust-100 text-cream-100 font-inria flex-shrink-0 rounded-full px-3 py-1 text-sm font-medium">
                        Selected
                      </span>
                    )}
                  </div>

                  {option.book.description && (
                    <div className="mb-3">
                      <div
                        className={`text-dark-600 text-sm ${isExpanded ? "" : "line-clamp-2"}`}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeDescription(option.book.description),
                        }}
                      />
                      {hasLongDescription && (
                        <button
                          onClick={() => toggleDescription(option.book.id)}
                          className="text-gold-700 hover:text-gold-800 mt-1 text-xs font-medium"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    {/* Vote Count - only show when votes are visible */}
                    {showVoteCounts && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="text-dark-500 h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                          />
                        </svg>
                        <span className="font-inria text-dark-600 text-sm font-medium">
                          {option.voteCount}{" "}
                          {option.voteCount === 1 ? "vote" : "votes"}
                        </span>
                      </div>
                    )}

                    {/* Your vote indicator during voting */}
                    {canVote && option.userHasVoted && (
                      <span className="text-rust-700 text-xs font-medium">
                        Your vote
                      </span>
                    )}

                    {/* Vote Button - only during active voting with approval method */}
                    {canVote && currentMethod === "approval" && (
                      <Button
                        size="sm"
                        variant={option.userHasVoted ? "default" : "outline"}
                        onClick={() => handleVote(option.id)}
                        disabled={isVoting}
                      >
                        {isVoting
                          ? "..."
                          : option.userHasVoted
                            ? "Remove Vote"
                            : "Vote"}
                      </Button>
                    )}

                    {/* Finalize Button (Admin Only) */}
                    {!isFinalized && currentUserIsAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFinalize(option.book.id)}
                        disabled={isFinalizing}
                        className="ml-auto"
                      >
                        {isFinalizing ? "Finalizing..." : "Select This Book"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
