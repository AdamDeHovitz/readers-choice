import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import {
  getGlobalRankings,
  getYearsWithRankings,
} from "@/app/actions/global-rankings";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalRankingsList } from "@/components/rankings/global-rankings-list";
import Link from "next/link";

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
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/book-clubs/${id}`}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-slate-900">
                {bookClub.name}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{session.user.name}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Global Rankings
            </CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              Rankings based on all members' votes using Borda Count scoring.
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
