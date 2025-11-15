"use client";

import { useState, useEffect } from "react";
import { getYearBooks } from "@/app/actions/rankings";
import { RankingInterface } from "./ranking-interface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  meetingDate: string;
  rank: number | null;
}

interface RankingsContainerProps {
  bookClubId: string;
  years: number[];
  initialYear: number;
  initialBooks: Book[];
}

export function RankingsContainer({
  bookClubId,
  years,
  initialYear,
  initialBooks,
}: RankingsContainerProps) {
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadBooks() {
      setIsLoading(true);
      const newBooks = await getYearBooks(bookClubId, selectedYear);
      setBooks(newBooks);
      setIsLoading(false);
    }

    loadBooks();
  }, [selectedYear, bookClubId]);

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Personal Rankings</CardTitle>
              <p className="text-dark-600 mt-1">
                Rank your favorite books from {selectedYear}
              </p>
            </div>
            <div className="flex gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg font-medium font-inria transition-colors ${
                    year === selectedYear
                      ? "bg-gold-600 text-white"
                      : "bg-white text-dark-600 border border-gold-600/20 hover:bg-cream-100"
                  } ${isLoading ? "opacity-50" : ""}`}
                >
                  {year}
                </button>
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
            <p className="text-sm text-dark-600">
              Drag books to change their ranking. Mark books as &quot;Not Read&quot; if
              you didn&apos;t attend that meeting.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-dark-600">Loading books...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-12">
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
