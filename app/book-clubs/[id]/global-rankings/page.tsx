import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import {
  getGlobalRankings,
  getYearsWithRankings,
} from "@/app/actions/global-rankings";
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
  const session = await auth();
  const { id } = await params;
  const { year: yearParam } = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  const [bookClub, availableYears] = await Promise.all([
    getBookClubDetails(id),
    getYearsWithRankings(id),
  ]);

  if (!bookClub) {
    redirect("/dashboard");
  }

  // Default to current year or most recent year with data
  const currentYear = new Date().getFullYear();
  const selectedYear = yearParam
    ? parseInt(yearParam)
    : availableYears.includes(currentYear)
      ? currentYear
      : availableYears[0] || currentYear;

  const globalRankings = await getGlobalRankings(id, selectedYear);

  return (
    <div className="min-h-screen bg-cream-100">
      <BookClubNav
        bookClubId={id}
        bookClubName={bookClub.name}
        userName={session.user.name || "User"}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-inria text-dark-900">
              Global Rankings
            </CardTitle>
            <p className="text-sm text-dark-600 mt-2">
              Rankings based on all members&apos; votes using Borda Count scoring.
              Books ranked higher by members earn more points.
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
