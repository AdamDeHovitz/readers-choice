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
    <div className="bg-cream-100 min-h-screen">
      <header className="bg-cream-100 border-gold-600/20 border-b">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-voga text-dark-900 text-4xl tracking-wider uppercase">
                Browse Book Clubs
              </h1>
              <p className="text-dark-600 font-inria mt-2">
                Book clubs are invite-only. Ask a club admin for an invite link
                to join.
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
              <Card key={club.id} className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="font-inria text-dark-900 text-xl">
                    {club.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {club.description && (
                    <p className="text-dark-600 font-inria mb-4 line-clamp-3 text-sm">
                      {club.description}
                    </p>
                  )}

                  <div className="text-dark-500 mb-4 flex items-center gap-2 text-sm">
                    <UsersIcon className="h-4 w-4" />
                    <span className="font-inria">
                      {club.memberCount}{" "}
                      {club.memberCount === 1 ? "member" : "members"}
                    </span>
                  </div>

                  {club.isMember ? (
                    <Link href={`/book-clubs/${club.id}`}>
                      <Button className="w-full" variant="secondary">
                        View
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-dark-500 font-inria text-center text-sm">
                      Invite required to join
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
