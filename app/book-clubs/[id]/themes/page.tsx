import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getBookClubThemes } from "@/app/actions/themes";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SuggestThemeDialog } from "@/components/themes/suggest-theme-dialog";
import { ThemesList } from "@/components/themes/themes-list";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ThemesPage({
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

  const themes = await getBookClubThemes(bookClubId);

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
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Themes</CardTitle>
                  <p className="text-slate-600 mt-1">
                    Suggest themes for future meetings and vote on your
                    favorites
                  </p>
                </div>
                <SuggestThemeDialog bookClubId={bookClubId} />
              </div>
            </CardHeader>
          </Card>

          {/* Themes List */}
          <Card>
            <CardHeader>
              <CardTitle>
                All Themes
                {themes.length > 0 && (
                  <span className="ml-2 text-base font-normal text-slate-500">
                    ({themes.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThemesList themes={themes} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
