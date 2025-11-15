import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  getBookClubYears,
  getYearBooks,
} from "@/app/actions/rankings";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { RankingsContainer } from "@/components/rankings/rankings-container";
import Link from "next/link";
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

  // Get book club details
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: bookClub } = await supabase
    .from("book_clubs")
    .select("id, name")
    .eq("id", bookClubId)
    .single();

  if (!bookClub) {
    redirect("/dashboard");
  }

  // Check if user is a member
  const { data: member } = await supabase
    .from("members")
    .select("user_id")
    .eq("book_club_id", bookClubId)
    .eq("user_id", session.user.id)
    .single();

  if (!member) {
    redirect("/dashboard");
  }

  // Get available years and books for the most recent year
  const years = await getBookClubYears(bookClubId);

  if (years.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Link
                  href={`/book-clubs/${bookClubId}`}
                  className="text-slate-600 hover:text-slate-900"
                >
                  ← Back to {bookClub.name}
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">
                  {session.user.name}
                </span>
                <SignOutButton />
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>No Books to Rank Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
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
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/book-clubs/${bookClubId}`}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Back to {bookClub.name}
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{session.user.name}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

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
