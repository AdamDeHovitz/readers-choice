import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getBookClubThemes } from "@/server/themes";
import { getViewer } from "@/server/viewer";
import { SuggestThemeDialog } from "@/components/themes/suggest-theme-dialog";
import { ThemesList } from "@/components/themes/themes-list";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Themes" };

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
    <>
      <PageHeader
        title="Themes"
        description="Suggest themes for future meetings and upvote your favorites."
        actions={<SuggestThemeDialog bookClubId={bookClubId} />}
      />
      <ThemesList
        themes={themes}
        currentUserId={viewer.userId}
        isAdmin={bookClub.currentUserIsAdmin}
      />
    </>
  );
}
