import { auth } from "@/auth";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import { getBookClubMeetings } from "@/app/actions/meetings";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MemberList } from "@/components/book-clubs/member-list";
import { DeleteBookClubDialog } from "@/components/book-clubs/delete-book-club-dialog";
import { EditDescriptionDialog } from "@/components/book-clubs/edit-description-dialog";
import { InviteLinkDialog } from "@/components/book-clubs/invite-link-dialog";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { LogPastMeetingDialog } from "@/components/meetings/log-past-meeting-dialog";
import { MeetingTimeline } from "@/components/meetings/meeting-timeline";
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

  const [bookClub, meetings] = await Promise.all([
    getBookClubDetails(id),
    getBookClubMeetings(id),
  ]);

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
                <div className="flex items-center justify-between">
                  <CardTitle>About</CardTitle>
                  {bookClub.currentUserIsAdmin && (
                    <EditDescriptionDialog
                      bookClubId={bookClub.id}
                      currentDescription={bookClub.description}
                    />
                  )}
                </div>
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

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/book-clubs/${bookClub.id}/themes`}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="font-medium text-slate-900">Themes</span>
                    <span className="text-sm text-slate-500">
                      View and suggest →
                    </span>
                  </Link>
                  <Link
                    href={`/book-clubs/${bookClub.id}/rankings`}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="font-medium text-slate-900">
                      Personal Rankings
                    </span>
                    <span className="text-sm text-slate-500">
                      Rank your favorites →
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Meetings</CardTitle>
                  {bookClub.currentUserIsAdmin && (
                    <div className="flex gap-2">
                      <LogPastMeetingDialog bookClubId={bookClub.id} />
                      <CreateMeetingDialog bookClubId={bookClub.id} />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <MeetingTimeline meetings={meetings} />
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
                    <InviteLinkDialog
                      bookClubId={bookClub.id}
                      bookClubName={bookClub.name}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <MemberList
                  members={bookClub.members}
                  currentUserId={session.user.id!}
                  currentUserIsAdmin={bookClub.currentUserIsAdmin}
                  bookClubId={bookClub.id}
                />
              </CardContent>
            </Card>

            {bookClub.currentUserIsAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    Permanently delete this book club and all associated data.
                  </p>
                  <DeleteBookClubDialog
                    bookClubId={bookClub.id}
                    bookClubName={bookClub.name}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
