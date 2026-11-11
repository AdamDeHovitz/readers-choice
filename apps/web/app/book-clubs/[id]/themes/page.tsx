import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadPageData } from "@/app/_operations/page-data";
import { listThemes } from "@/server/operations/themes";
import { SuggestThemeDialog } from "@/components/themes/suggest-theme-dialog";
import { ThemesList } from "@/components/themes/themes-list";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Themes" };

export default async function ThemesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookClubId } = await params;
  // Non-members land on the club page, which offers to join.
  const { themes } = await loadPageData(
    listThemes,
    { bookClubId },
    { onRefused: () => redirect(`/book-clubs/${bookClubId}`) }
  );

  return (
    <>
      <PageHeader
        title="Themes"
        description="Suggest themes for future meetings and upvote your favorites."
        actions={<SuggestThemeDialog bookClubId={bookClubId} />}
      />
      <ThemesList themes={themes} />
    </>
  );
}
