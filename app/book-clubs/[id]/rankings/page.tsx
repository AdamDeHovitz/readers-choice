import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getBookClubYears, getYearBooks } from "@/server/rankings";
import { getViewer } from "@/server/viewer";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { RankingsContainer } from "@/components/rankings/rankings-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  if (years.length === 0) {
    return (
      <div className="bg-cream-100 min-h-screen">
        <BookClubNav
          bookClubId={bookClubId}
          bookClubName={bookClub.name}
          userName={viewer.name}
        />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle>No Books to Rank Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-dark-600">
                This book club doesn&apos;t have any finalized meetings yet.
                Check back once some meetings have been completed!
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ?year= picks a year (default: the most recent).
  const year = years.find((y) => String(y) === yearParam) ?? years[0];
  const books = await getYearBooks(viewer, bookClubId, year);

  return (
    <div className="bg-cream-100 min-h-screen">
      <BookClubNav
        bookClubId={bookClubId}
        bookClubName={bookClub.name}
        userName={viewer.name}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <RankingsContainer
          bookClubId={bookClubId}
          years={years}
          year={year}
          books={books}
        />
      </main>
    </div>
  );
}
