import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LibraryIcon } from "lucide-react";
import { loadPageData } from "@/app/_operations/page-data";
import { CreateBookClubDialog } from "@/components/book-clubs/create-book-club-dialog";
import { BookClubCard } from "@/components/book-clubs/book-club-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listMyClubs } from "@/server/operations/clubs";
import { getViewer } from "@/server/viewer";

export const metadata: Metadata = { title: "My clubs" };

export default async function DashboardPage() {
  // The same read the mobile app's clubs screen makes (clubs.mine).
  const [{ clubs }, viewer] = await Promise.all([
    loadPageData(listMyClubs, {}, { onRefused: () => redirect("/login") }),
    getViewer(),
  ]);
  const firstName = viewer?.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title="My clubs"
        description={firstName && `Welcome back, ${firstName}.`}
        actions={clubs.length > 0 && <CreateBookClubDialog />}
      />

      {clubs.length === 0 ? (
        <EmptyState
          icon={<LibraryIcon />}
          title="No book clubs yet"
          description="Start one and invite your friends, or ask a club admin for an invite link."
          action={<CreateBookClubDialog />}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {clubs.map((club) => (
            <li key={club.id}>
              <BookClubCard
                id={club.id}
                name={club.name}
                description={club.description}
                isAdmin={club.isAdmin}
                joinedAt={club.joinedAt}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
