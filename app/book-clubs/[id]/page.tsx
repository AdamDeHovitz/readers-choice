import { auth } from "@/auth";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import { SignOutButton } from "@/components/auth/sign-out-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BookClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  const bookClub = await getBookClubDetails(id);

  if (!bookClub) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-slate-600 hover:text-slate-900"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-slate-900">
                {bookClub.name}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {session.user.name}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                {bookClub.description ? (
                  <p className="text-slate-600">{bookClub.description}</p>
                ) : (
                  <p className="text-slate-400 italic">
                    No description provided
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 italic">
                  No meetings scheduled yet
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Members ({bookClub.members.length})</CardTitle>
                  {bookClub.currentUserIsAdmin && (
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookClub.members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex-shrink-0">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {member.name}
                          </p>
                          {member.isAdmin && (
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
