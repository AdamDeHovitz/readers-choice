import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import { getBookClubThemes } from "@/app/actions/themes";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { SuggestThemeDialog } from "@/components/themes/suggest-theme-dialog";
import { ThemesList } from "@/components/themes/themes-list";
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

  const bookClub = await getBookClubDetails(bookClubId);

  if (!bookClub) {
    redirect("/dashboard");
  }

  const themes = await getBookClubThemes(bookClubId);

  return (
    <div className="min-h-screen bg-cream-100">
      <BookClubNav
        bookClubId={bookClubId}
        bookClubName={bookClub.name}
        userName={session.user.name || "User"}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Themes</CardTitle>
                  <p className="text-dark-600 mt-1">
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
                  <span className="ml-2 text-base font-normal text-dark-500">
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
