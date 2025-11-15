"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voteForBook, finalizeMeeting } from "@/app/actions/meetings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

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
}

export function BookOptionsList({
  bookOptions,
  isFinalized,
  selectedBookId,
  currentUserIsAdmin,
  meetingId,
}: BookOptionsListProps) {
  const router = useRouter();
  const [votingForId, setVotingForId] = useState<string | null>(null);
  const [finalizingBookId, setFinalizingBookId] = useState<string | null>(null);

  if (bookOptions.length === 0) {
    return (
      <p className="text-slate-400 italic text-center py-8">
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

  // Sort by vote count (highest first)
  const sortedOptions = [...bookOptions].sort(
    (a, b) => b.voteCount - a.voteCount
  );

  return (
    <div className="space-y-4">
      {sortedOptions.map((option, index) => {
        const isWinner = isFinalized && option.book.id === selectedBookId;
        const isVoting = votingForId === option.id;
        const isFinalizing = finalizingBookId === option.book.id;

        return (
          <Card
            key={option.id}
            className={`${
              isWinner ? "ring-2 ring-green-500 bg-green-50" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Rank Badge */}
                {!isFinalized && (
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-900"
                          : "bg-slate-100 text-slate-600"
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
                      className="w-20 h-30 object-cover rounded shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-30 bg-slate-200 rounded flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-slate-400"
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {option.book.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-1">
                        by {option.book.author}
                      </p>
                      {option.book.publishedYear && (
                        <p className="text-xs text-slate-500">
                          Published {option.book.publishedYear}
                        </p>
                      )}
                    </div>

                    {isWinner && (
                      <span className="flex-shrink-0 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </div>

                  {option.book.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {option.book.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    {/* Vote Count */}
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-slate-400"
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
                      <span className="text-sm font-medium text-slate-700">
                        {option.voteCount}{" "}
                        {option.voteCount === 1 ? "vote" : "votes"}
                      </span>
                    </div>

                    {/* Vote Button */}
                    {!isFinalized && (
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
