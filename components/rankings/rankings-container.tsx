import Link from "next/link";
import { RankingInterface } from "./ranking-interface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { YearBook } from "@/server/rankings";

interface RankingsContainerProps {
  bookClubId: string;
  years: number[];
  year: number;
  books: YearBook[];
}

export function RankingsContainer({
  bookClubId,
  years,
  year: selectedYear,
  books,
}: RankingsContainerProps) {
  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Personal Rankings</CardTitle>
              <p className="text-dark-600 mt-1">
                Rank your favorite books from {selectedYear}
              </p>
            </div>
            <div className="flex gap-2">
              {years.map((year) => (
                <Link
                  key={year}
                  href={`/book-clubs/${bookClubId}/rankings?year=${year}`}
                  aria-current={year === selectedYear ? "page" : undefined}
                  className={`font-inria rounded-lg px-4 py-2 font-medium transition-colors ${
                    year === selectedYear
                      ? "bg-gold-600 text-white"
                      : "text-dark-600 border-gold-600/20 hover:bg-cream-100 border bg-white"
                  }`}
                >
                  {year}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Ranking interface */}
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle>Drag to Reorder</CardTitle>
            <p className="text-dark-600 text-sm">
              Drag books to change their ranking. Mark books as &quot;Not
              Read&quot; if you didn&apos;t attend that meeting.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {books.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-dark-600">
                No books were finalized for {selectedYear}.
              </p>
            </div>
          ) : (
            <RankingInterface
              key={selectedYear} // Force remount when year changes
              bookClubId={bookClubId}
              year={selectedYear}
              initialBooks={books}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
