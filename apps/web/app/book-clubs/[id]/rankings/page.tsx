import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrophyIcon } from "lucide-react";
import { getBookClubDetails } from "@/server/clubs";
import { getBookClubYears, getYearBooks } from "@/server/rankings";
import { getViewer } from "@/server/viewer";
import { RankingsContainer } from "@/components/rankings/rankings-container";
import { RankingsHeader } from "@/components/rankings/rankings-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "My ranking" };

export default async function RankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const [viewer, { id: bookClubId }, { year: yearParam }] = await Promise.all([
    getViewer(),
    params,
    searchParams,
  ]);
  if (!viewer) {
    redirect("/login");
  }

  const [bookClub, years] = await Promise.all([
    getBookClubDetails(viewer, bookClubId),
    getBookClubYears(viewer, bookClubId),
  ]);

  if (!bookClub) {
    redirect("/dashboard");
  }

  // ?year= picks a year (default: the most recent).
  const year = years.find((y) => String(y) === yearParam) ?? years[0];
  const books =
    year === undefined ? [] : await getYearBooks(viewer, bookClubId, year);

  return (
    <>
      <RankingsHeader
        bookClubId={bookClubId}
        view="mine"
        years={years}
        year={year ?? new Date().getFullYear()}
        description={
          year === undefined
            ? "Rank the books your club has read."
            : `Drag to rank the books from ${year}. Mark any you didn't read.`
        }
      />
      {year === undefined ? (
        <EmptyState
          icon={<TrophyIcon />}
          title="No books to rank yet"
          description="Books show up here once your club finalizes its first meeting."
        />
      ) : (
        <RankingsContainer bookClubId={bookClubId} year={year} books={books} />
      )}
    </>
  );
}
