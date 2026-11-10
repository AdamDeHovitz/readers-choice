import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getGlobalRankings, getYearsWithRankings } from "@/server/rankings";
import { getViewer } from "@/server/viewer";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalRankingsList } from "@/components/rankings/global-rankings-list";

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
    <div className="bg-cream-100 min-h-screen">
      <BookClubNav
        bookClubId={id}
        bookClubName={bookClub.name}
        userName={viewer.name}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-inria text-dark-900 text-2xl font-bold">
              Global Rankings
            </CardTitle>
            <p className="text-dark-600 mt-2 text-sm">
              Rankings based on all members&apos; votes using Borda Count
              scoring. Books ranked higher by members earn more points.
            </p>
          </CardHeader>
          <CardContent>
            <GlobalRankingsList
              bookClubId={id}
              rankings={globalRankings}
              availableYears={availableYears}
              selectedYear={selectedYear}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
