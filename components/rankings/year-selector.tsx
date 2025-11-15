"use client";

import Link from "next/link";

interface YearSelectorProps {
  bookClubId: string;
  years: number[];
  selectedYear: number;
}

export function YearSelector({
  bookClubId,
  years,
  selectedYear,
}: YearSelectorProps) {
  return (
    <div className="flex gap-2">
      {years.map((year) => (
        <Link
          key={year}
          href={`/book-clubs/${bookClubId}/rankings?year=${year}`}
          className={`px-4 py-2 rounded-lg font-medium font-inria transition-colors ${
            year === selectedYear
              ? "bg-gold-600 text-white"
              : "bg-white text-dark-600 border border-gold-600/20 hover:bg-cream-100"
          }`}
        >
          {year}
        </Link>
      ))}
    </div>
  );
}
