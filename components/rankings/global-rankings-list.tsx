"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TrophyIcon, UsersIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getIndividualBookRankings } from "@/app/actions/global-rankings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GlobalRankingBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  totalPoints: number;
  numberOfRankings: number;
  averageRank: number;
}

interface GlobalRankingsListProps {
  bookClubId: string;
  rankings: GlobalRankingBook[];
  availableYears: number[];
  selectedYear: number;
}

interface IndividualRanking {
  userId: string;
  userName: string;
  userImage: string | null;
  rank: number | null;
}

export function GlobalRankingsList({
  bookClubId,
  rankings,
  availableYears,
  selectedYear,
}: GlobalRankingsListProps) {
  const router = useRouter();
  const [currentYear, setCurrentYear] = useState(selectedYear);
  const [selectedBook, setSelectedBook] = useState<GlobalRankingBook | null>(
    null
  );
  const [individualRankings, setIndividualRankings] = useState<
    IndividualRanking[]
  >([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleYearChange(year: number) {
    setCurrentYear(year);
    router.push(`/book-clubs/${bookClubId}/global-rankings?year=${year}`);
  }

  async function handleBookClick(book: GlobalRankingBook) {
    setSelectedBook(book);
    setIsDialogOpen(true);
    setIsLoading(true);

    try {
      const rankings = await getIndividualBookRankings(
        bookClubId,
        book.id,
        currentYear
      );
      setIndividualRankings(rankings);
    } catch (error) {
      console.error("Error fetching individual rankings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Medal colors for top 3
  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-gold-600";
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
      {/* Year Selector */}
      {availableYears.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => handleYearChange(year)}
              className={`font-inria rounded-lg px-4 py-2 font-medium transition-colors ${
                year === currentYear
                  ? "bg-gold-600 text-white"
                  : "bg-cream-200 text-dark-600 hover:bg-cream-200"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Rankings List */}
      {rankings.length === 0 ? (
        <div className="py-12 text-center">
          <TrophyIcon className="text-gold-300 mx-auto mb-4 h-12 w-12" />
          <p className="text-dark-500">
            No rankings yet for {currentYear}. Members need to rank their
            favorite books first!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rankings.map((book, index) => {
            const rank = index + 1;
            return (
              <button
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="border-gold-600/20 bg-cream-100 hover:bg-cream-200 hover:border-gold-600/40 flex w-full cursor-pointer gap-4 rounded-lg border p-4 text-left transition-all"
              >
                {/* Rank */}
                <div
                  className={`font-inria flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${getMedalColor(rank)}`}
                >
                  {getRankDisplay(rank)}
                </div>

                {/* Book Cover */}
                <div className="flex-shrink-0">
                  {book.coverUrl ? (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      width={80}
                      height={120}
                      className="rounded object-cover shadow-sm"
                    />
                  ) : (
                    <div className="bg-cream-200 flex h-30 w-20 items-center justify-center rounded">
                      <span className="text-dark-500 text-xs">No cover</span>
                    </div>
                  )}
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
                      <TrophyIcon className="text-gold-700 h-4 w-4 flex-shrink-0" />
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
      <div className="bg-gold-50 border-gold-600 rounded-lg border p-4">
        <h4 className="font-inria text-dark-900 mb-2 font-medium">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-inria text-dark-900">
              Individual Rankings
            </DialogTitle>
            {selectedBook && (
              <div className="border-gold-600/20 mt-3 flex gap-3 border-b pb-3">
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
                    className="bg-cream-100 border-gold-600/20 flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={ranking.userImage || undefined} />
                      <AvatarFallback className="bg-gold-200 text-dark-900 font-medium">
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
