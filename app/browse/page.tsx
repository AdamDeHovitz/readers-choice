import { auth } from "@/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsersIcon } from "lucide-react";
import { getAllBookClubs } from "@/app/actions/book-clubs";

export default async function BrowsePage() {
  const session = await auth();
  const bookClubs = await getAllBookClubs();

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-cream-100 border-b border-gold-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-voga text-dark-900 uppercase tracking-wider">
                Browse Book Clubs
              </h1>
              <p className="text-dark-600 mt-2 font-inria">
                Find a book club to join
              </p>
            </div>
            {session && (
              <Link href="/dashboard">
                <Button variant="outline">My Book Clubs</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {bookClubs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-dark-600 font-inria">
                No book clubs yet. {session && "Be the first to create one!"}
              </p>
              {session && (
                <Link href="/dashboard">
                  <Button className="mt-4">Create Book Club</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookClubs.map((club) => (
              <Card key={club.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl font-inria text-dark-900">
                    {club.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {club.description && (
                    <p className="text-sm text-dark-600 mb-4 line-clamp-3 font-inria">
                      {club.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-dark-500 mb-4">
                    <UsersIcon className="h-4 w-4" />
                    <span className="font-inria">
                      {club.memberCount} {club.memberCount === 1 ? "member" : "members"}
                    </span>
                  </div>

                  <Link href={`/book-clubs/${club.id}`}>
                    <Button className="w-full" variant={club.isMember ? "secondary" : "default"}>
                      {club.isMember ? "View" : "Join"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
