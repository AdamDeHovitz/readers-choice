import { auth } from "@/auth";
import { getMeetingDetails } from "@/app/actions/meetings";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { EditMeetingDialog } from "@/components/meetings/edit-meeting-dialog";
import { BookOptionsList } from "@/components/meetings/book-options-list";
import { NominationForm } from "@/components/nominations/nomination-form";
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

  // Check if nomination period is open
  const now = new Date();
  const nominationDeadline = meeting.nominationDeadline
    ? new Date(meeting.nominationDeadline)
    : null;
  const nominationsOpen =
    !meeting.isFinalized &&
    (!nominationDeadline || nominationDeadline > now);

  return (
    <div className="min-h-screen bg-cream-100">
      <nav className="bg-white border-b border-gold-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/book-clubs/${meeting.bookClub.id}`}
                className="text-dark-600 hover:text-dark-900"
              >
                ← Back to {meeting.bookClub.name}
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-dark-600">
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
                        currentNominationDeadline={meeting.nominationDeadline || null}
                        currentVotingDeadline={meeting.votingDeadline || null}
                        currentTheme={meeting.theme?.name || null}
                        currentBook={meeting.selectedBook || null}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-dark-600">
                      {meetingDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {meeting.votingDeadline && !meeting.isFinalized && (
                      <p className="text-sm text-dark-500">
                        Voting closes:{" "}
                        {new Date(meeting.votingDeadline).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  {meeting.isFinalized ? (
                    <span className="text-sm bg-rust-100 text-cream-100 px-3 py-1 rounded-full font-medium font-inria">
                      Finalized
                    </span>
                  ) : isPast ? (
                    <span className="text-sm bg-cream-200 text-dark-600 px-3 py-1 rounded-full font-medium font-inria">
                      Past
                    </span>
                  ) : (
                    <span className="text-sm bg-gold-100 text-dark-900 px-3 py-1 rounded-full font-medium font-inria">
                      Voting Open
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Nomination Form */}
          {nominationsOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-inria text-dark-900">
                  Nominate a Book
                </CardTitle>
                {nominationDeadline && (
                  <p className="text-sm text-dark-600 mt-2">
                    Nominations close{" "}
                    {nominationDeadline.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <NominationForm
                  meetingId={meeting.id}
                  bookClubId={meeting.bookClub.id}
                  existingNominations={meeting.bookOptions}
                />
              </CardContent>
            </Card>
          )}

          {/* Book Options */}
          <Card>
            <CardHeader>
              <CardTitle>
                {nominationsOpen ? "Nominated Books" : "Book Options"}
                {meeting.bookOptions.length > 0 && (
                  <span className="ml-2 text-base font-normal text-dark-500">
                    ({meeting.bookOptions.length})
                  </span>
                )}
              </CardTitle>
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
