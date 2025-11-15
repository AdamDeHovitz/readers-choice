import { auth } from "@/auth";
import { getMeetingDetails } from "@/app/actions/meetings";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AddBookOptionDialog } from "@/components/meetings/add-book-option-dialog";
import { EditMeetingDialog } from "@/components/meetings/edit-meeting-dialog";
import { BookOptionsList } from "@/components/meetings/book-options-list";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  const meeting = await getMeetingDetails(id);

  if (!meeting) {
    redirect("/dashboard");
  }

  const meetingDate = new Date(meeting.meetingDate);
  const isPast = meetingDate < new Date();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/book-clubs/${meeting.bookClub.id}`}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Back to {meeting.bookClub.name}
              </Link>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Meeting Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl">
                      {meeting.theme
                        ? meeting.theme.name
                        : "Meeting " + meetingDate.toLocaleDateString()}
                    </CardTitle>
                    {meeting.currentUserIsAdmin && (
                      <EditMeetingDialog
                        meetingId={meeting.id}
                        currentDate={meeting.meetingDate}
                        currentTheme={meeting.theme?.name || null}
                        currentBook={meeting.selectedBook || null}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-600">
                      {meetingDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {meetingDate.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {meeting.votingDeadline && !meeting.isFinalized && (
                      <p className="text-sm text-slate-500">
                        Voting closes:{" "}
                        {new Date(meeting.votingDeadline).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  {meeting.isFinalized ? (
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                      Finalized
                    </span>
                  ) : isPast ? (
                    <span className="text-sm bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
                      Past
                    </span>
                  ) : (
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                      Voting Open
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Book Options */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Book Options
                  {meeting.bookOptions.length > 0 && (
                    <span className="ml-2 text-base font-normal text-slate-500">
                      ({meeting.bookOptions.length})
                    </span>
                  )}
                </CardTitle>
                {meeting.currentUserIsAdmin && !meeting.isFinalized && (
                  <AddBookOptionDialog meetingId={meeting.id} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <BookOptionsList
                bookOptions={meeting.bookOptions}
                isFinalized={meeting.isFinalized}
                selectedBookId={meeting.selectedBookId}
                currentUserIsAdmin={meeting.currentUserIsAdmin}
                meetingId={meeting.id}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
