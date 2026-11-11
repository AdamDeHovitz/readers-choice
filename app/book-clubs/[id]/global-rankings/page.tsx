import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getGlobalRankings, getYearsWithRankings } from "@/server/rankings";
import { getViewer } from "@/server/viewer";
import { GlobalRankingsList } from "@/components/rankings/global-rankings-list";
import { RankingsHeader } from "@/components/rankings/rankings-header";

export const metadata: Metadata = { title: "Club ranking" };

export default async function GlobalRankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const [viewer, { id }, { year: yearParam }] = await Promise.all([
    getViewer(),
    params,
    searchParams,
  ]);
  if (!viewer) {
    redirect("/login");
  }

  const [bookClub, availableYears] = await Promise.all([
    getBookClubDetails(viewer, id),
    getYearsWithRankings(viewer, id),
  ]);

  if (!bookClub) {
    redirect("/dashboard");
  }

  // Default to current year or most recent year with data
  const currentYear = new Date().getFullYear();
  const selectedYear =
    availableYears.find((year) => String(year) === yearParam) ??
    (availableYears.includes(currentYear)
      ? currentYear
      : (availableYears[0] ?? currentYear));

  const globalRankings = await getGlobalRankings(viewer, id, selectedYear);

  return (
    <>
      <RankingsHeader
        bookClubId={id}
        view="club"
        years={availableYears}
        year={selectedYear}
        description="Everyone's rankings combined. Tap a book to see how each member ranked it."
      />
      <GlobalRankingsList
        bookClubId={id}
        rankings={globalRankings}
        selectedYear={selectedYear}
      />
    </>
  );
}
