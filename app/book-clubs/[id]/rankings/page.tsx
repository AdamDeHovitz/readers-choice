import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import {
  getBookClubYears,
  getYearBooks,
} from "@/app/actions/rankings";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { RankingsContainer } from "@/components/rankings/rankings-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id: bookClubId } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  // Parallelize book club details and years queries
  const [bookClub, years] = await Promise.all([
    getBookClubDetails(bookClubId),
    getBookClubYears(bookClubId),
  ]);

  if (!bookClub) {
    redirect("/dashboard");
  }

  if (years.length === 0) {
    return (
      <div className="min-h-screen bg-cream-100">
        <BookClubNav
          bookClubId={bookClubId}
          bookClubName={bookClub.name}
          userName={session.user.name || "User"}
        />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>No Books to Rank Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-dark-600">
                This book club doesn&apos;t have any finalized meetings yet. Check
                back once some meetings have been completed!
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Get books for the most recent year initially
  const initialYear = years[0];
  const initialBooks = await getYearBooks(bookClubId, initialYear);

  return (
    <div className="min-h-screen bg-cream-100">
      <BookClubNav
        bookClubId={bookClubId}
        bookClubName={bookClub.name}
        userName={session.user.name || "User"}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RankingsContainer
          bookClubId={bookClubId}
          years={years}
          initialYear={initialYear}
          initialBooks={initialBooks}
        />
      </main>
    </div>
  );
}
