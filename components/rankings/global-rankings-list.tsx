"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TrophyIcon, UsersIcon } from "lucide-react";

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

export function GlobalRankingsList({
  bookClubId,
  rankings,
  availableYears,
  selectedYear,
}: GlobalRankingsListProps) {
  const router = useRouter();
  const [currentYear, setCurrentYear] = useState(selectedYear);

  function handleYearChange(year: number) {
    setCurrentYear(year);
    router.push(`/book-clubs/${bookClubId}/global-rankings?year=${year}`);
  }

  // Medal colors for top 3
  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-600";
    if (rank === 2) return "text-dark-500";
    if (rank === 3) return "text-amber-700";
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
        <div className="flex gap-2 flex-wrap">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => handleYearChange(year)}
              className={`px-4 py-2 rounded-lg font-medium font-inria transition-colors ${
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
        <div className="text-center py-12">
          <TrophyIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
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
              <div
                key={book.id}
                className={`flex gap-4 p-4 rounded-lg border transition-all ${
                  rank <= 3
                    ? "border-gold-600/20 bg-cream-100"
                    : "border-gold-600/20 bg-white"
                }`}
              >
                {/* Rank */}
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full font-bold font-inria text-xl ${getMedalColor(rank)}`}
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
                      className="rounded shadow-sm object-cover"
                    />
                  ) : (
                    <div className="w-20 h-30 bg-cream-200 rounded flex items-center justify-center">
                      <span className="text-dark-500 text-xs">No cover</span>
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold font-inria text-dark-900 text-lg truncate">
                    {book.title}
                  </h3>
                  <p className="text-sm text-dark-600 truncate">{book.author}</p>

                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <TrophyIcon className="h-4 w-4 text-gold-700" />
                      <span className="font-semibold font-inria text-dark-900">
                        {book.totalPoints}
                      </span>
                      <span className="text-dark-500">points</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm">
                      <UsersIcon className="h-4 w-4 text-dark-500" />
                      <span className="text-dark-600">
                        {book.numberOfRankings} member
                        {book.numberOfRankings !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="text-sm text-dark-500">
                      Avg rank: {book.averageRank.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explanation */}
      <div className="p-4 bg-gold-50 border border-gold-600 rounded-lg">
        <h4 className="font-medium font-inria text-dark-900 mb-2">How it works</h4>
        <p className="text-sm text-dark-900">
          Rankings are calculated using Borda Count scoring. When a member ranks
          their books, their #1 choice gets the most points, #2 gets fewer points,
          and so on. All members' points are combined to create this global
          ranking. Books that more members have ranked higher will appear at the
          top.
        </p>
      </div>
    </div>
  );
}
