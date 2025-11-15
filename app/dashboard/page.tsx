import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreateBookClubDialog } from "@/components/book-clubs/create-book-club-dialog";
import { BookClubCard } from "@/components/book-clubs/book-club-card";
import { getMyBookClubs } from "@/app/actions/book-clubs";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const bookClubs = await getMyBookClubs();

  return (
    <div className="min-h-screen bg-cream-100">
      <nav className="bg-white border-b border-gold-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold font-inria text-dark-900">
              Readers&apos; Choice
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-dark-600">
                {session.user.name}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold font-inria text-dark-900">My Book Clubs</h2>
            <p className="text-dark-600 mt-1">
              Manage your reading communities
            </p>
          </div>
          <CreateBookClubDialog />
        </div>

        {bookClubs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <h3 className="text-xl font-semibold font-inria text-dark-900 mb-2">
              No book clubs yet
            </h3>
            <p className="text-dark-600 mb-6">
              Create your first book club to get started!
            </p>
            <CreateBookClubDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
