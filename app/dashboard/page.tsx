import { AppNav } from "@/components/navigation/app-nav";
import { CreateBookClubDialog } from "@/components/book-clubs/create-book-club-dialog";
import { BookClubCard } from "@/components/book-clubs/book-club-card";
import { getMyBookClubs } from "@/server/clubs";
import { getViewer } from "@/server/viewer";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login");
  }

  const bookClubs = await getMyBookClubs(viewer);

  return (
    <div className="bg-cream-100 min-h-screen">
      <AppNav userName={viewer.name} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-inria text-dark-900 text-3xl font-bold">
              My Book Clubs
            </h2>
            <p className="text-dark-600 mt-1">
              Manage your reading communities
            </p>
          </div>
          <CreateBookClubDialog />
        </div>

        {bookClubs.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <h3 className="font-inria text-dark-900 mb-2 text-xl font-semibold">
              No book clubs yet
            </h3>
            <p className="text-dark-600 mb-6">
              Create your first book club to get started!
            </p>
            <CreateBookClubDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookClubs.map((club) => (
              <BookClubCard
                key={club.id}
                id={club.id}
                name={club.name}
                description={club.description}
                isAdmin={club.isAdmin}
                joinedAt={club.joinedAt}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
