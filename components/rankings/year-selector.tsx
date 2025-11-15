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
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            year === selectedYear
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {year}
        </Link>
      ))}
    </div>
  );
}
