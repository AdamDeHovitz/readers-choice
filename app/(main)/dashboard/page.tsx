import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LibraryIcon } from "lucide-react";
import { CreateBookClubDialog } from "@/components/book-clubs/create-book-club-dialog";
import { BookClubCard } from "@/components/book-clubs/book-club-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getMyBookClubs } from "@/server/clubs";
import { getViewer } from "@/server/viewer";

export const metadata: Metadata = { title: "My clubs" };

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login");
  }

  const bookClubs = await getMyBookClubs(viewer);

  return (
    <>
      <PageHeader
        title="My clubs"
        description={`Welcome back, ${viewer.name.split(" ")[0]}.`}
        actions={bookClubs.length > 0 && <CreateBookClubDialog />}
      />

      {bookClubs.length === 0 ? (
        <EmptyState
          icon={<LibraryIcon />}
          title="No book clubs yet"
          description="Start one and invite your friends, or ask a club admin for an invite link."
          action={<CreateBookClubDialog />}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {bookClubs.map((club) => (
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
