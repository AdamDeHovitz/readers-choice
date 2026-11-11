"use client";

import { useState } from "react";
import Image from "next/image";
import { TrophyIcon, UsersIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookCover } from "@/components/books/book-cover";
import { EmptyState } from "@/components/ui/empty-state";
import { getIndividualBookRankings } from "@/app/actions/rankings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { GlobalRankingBook, IndividualRanking } from "@/server/rankings";

interface GlobalRankingsListProps {
  bookClubId: string;
  rankings: GlobalRankingBook[];
  selectedYear: number;
}

export function GlobalRankingsList({
  bookClubId,
  rankings,
  selectedYear: currentYear,
}: GlobalRankingsListProps) {
  const [selectedBook, setSelectedBook] = useState<GlobalRankingBook | null>(
    null
  );
  const [individualRankings, setIndividualRankings] = useState<
    IndividualRanking[]
  >([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleBookClick(book: GlobalRankingBook) {
    setSelectedBook(book);
    setIsDialogOpen(true);
    setIsLoading(true);

    try {
      const result = await getIndividualBookRankings(
        bookClubId,
        book.id,
        currentYear
      );
      setIndividualRankings(result.success ? result.data : []);
    } catch (error) {
      console.error("Error fetching individual rankings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Medal colors for top 3
  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-sage-600";
    if (rank === 2) return "text-dark-500";
    if (rank === 3) return "text-rust-500";
    return "text-dark-600";
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="space-y-6">
      {/* Rankings List */}
      {rankings.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon />}
          title={`No rankings yet for ${currentYear}`}
          description="The club ranking appears once members rank their favorite books."
        />
      ) : (
        <div className="space-y-3">
          {rankings.map((book, index) => {
            const rank = index + 1;
            return (
              <button
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="border-border bg-card hover:border-dark-900/25 active:bg-muted flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left shadow-xs transition-colors sm:gap-4 sm:p-4"
              >
                {/* Rank */}
                <div
                  className={`font-inria flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${getMedalColor(rank)}`}
                >
                  {getRankDisplay(rank)}
                </div>

                {/* Book Cover */}
                <div className="flex-shrink-0">
                  <BookCover
                    coverUrl={book.coverUrl}
                    title={book.title}
                    size="sm"
                  />
                </div>

                {/* Book Info */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h3 className="font-inria text-dark-900 truncate text-lg font-semibold">
                    {book.title}
                  </h3>
                  <p className="text-dark-600 truncate text-sm">
                    {book.author}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                      <TrophyIcon className="text-sage-700 h-4 w-4 flex-shrink-0" />
                      <span className="font-inria text-dark-900 font-semibold">
                        {book.totalPoints}
                      </span>
                      <span className="text-dark-500">points</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                      <UsersIcon className="text-dark-500 h-4 w-4 flex-shrink-0" />
                      <span className="text-dark-600">
                        {book.numberOfRankings} member
                        {book.numberOfRankings !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="text-dark-500 text-sm whitespace-nowrap">
                      Avg rank: {book.averageRank.toFixed(1)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Explanation */}
      <div className="bg-muted/60 rounded-2xl p-4">
        <h4 className="font-inria text-foreground mb-1 font-bold">
          How it works
        </h4>
        <p className="text-dark-900 text-sm">
          Rankings are calculated using Borda Count scoring. When a member ranks
          their books, their #1 choice gets the most points, #2 gets fewer
          points, and so on. All members&apos; points are combined to create
          this global ranking. Books that more members have ranked higher will
          appear at the top.
        </p>
      </div>

      {/* Individual Rankings Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-inria text-dark-900">
              Individual Rankings
            </DialogTitle>
            {selectedBook && (
              <div className="border-border mt-3 flex gap-3 border-b pb-3">
                {selectedBook.coverUrl && (
                  <Image
                    src={selectedBook.coverUrl}
                    alt={selectedBook.title}
                    width={60}
                    height={90}
                    className="rounded object-cover shadow-sm"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-dark-900 text-base font-semibold">
                    {selectedBook.title}
                  </h3>
                  <p className="text-dark-600 text-sm">{selectedBook.author}</p>
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="mt-4">
            {isLoading ? (
              <div className="text-dark-500 py-8 text-center">
                Loading rankings...
              </div>
            ) : individualRankings.length === 0 ? (
              <div className="text-dark-500 py-8 text-center">
                No members have ranked this book yet.
              </div>
            ) : (
              <div className="max-h-96 space-y-3 overflow-y-auto">
                {individualRankings.map((ranking) => (
                  <div
                    key={ranking.userId}
                    className="bg-cream-100 border-border flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={ranking.userImage || undefined} />
                      <AvatarFallback className="bg-sage-200 text-dark-900 font-medium">
                        {ranking.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="text-dark-900 truncate font-medium">
                        {ranking.userName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-dark-500 text-sm">Ranked:</span>
                      <span className="font-inria text-dark-900 text-lg font-bold">
                        #{ranking.rank}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
