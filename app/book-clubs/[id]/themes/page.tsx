import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getBookClubThemes } from "@/server/themes";
import { getViewer } from "@/server/viewer";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { SuggestThemeDialog } from "@/components/themes/suggest-theme-dialog";
import { ThemesList } from "@/components/themes/themes-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ThemesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [viewer, { id: bookClubId }] = await Promise.all([getViewer(), params]);
  if (!viewer) {
    redirect("/login");
  }

  const [bookClub, themes] = await Promise.all([
    getBookClubDetails(viewer, bookClubId),
    getBookClubThemes(viewer, bookClubId),
  ]);

  if (!bookClub) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-cream-100 min-h-screen">
      <BookClubNav
        bookClubId={bookClubId}
        bookClubName={bookClub.name}
        userName={viewer.name}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
                  <span className="text-dark-500 ml-2 text-base font-normal">
                    ({themes.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThemesList
                themes={themes}
                currentUserId={viewer.userId}
                isAdmin={bookClub.currentUserIsAdmin}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
