import { auth } from "@/auth";
import { getMeetingDetails } from "@/app/actions/meetings";
import {
  getUserVotingPreference,
  getUserRankedVotes,
} from "@/app/actions/meeting-voting";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { EditMeetingDialog } from "@/components/meetings/edit-meeting-dialog";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { BookOptionsList } from "@/components/meetings/book-options-list";
import { NominationForm } from "@/components/nominations/nomination-form";
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
  const now = new Date();

  // Determine meeting phase
  const nominationDeadline = meeting.nominationDeadline
    ? new Date(meeting.nominationDeadline)
    : null;
  const votingDeadline = meeting.votingDeadline
    ? new Date(meeting.votingDeadline)
    : null;

  const nominationsOpen =
    !meeting.isFinalized && (!nominationDeadline || nominationDeadline > now);

  const votingOpen =
    !meeting.isFinalized &&
    nominationDeadline &&
    nominationDeadline <= now &&
    (!votingDeadline || votingDeadline > now);

  // Fetch user's voting preference and ranked votes in parallel
  const [userVotingMethod, userRankedVotes] = await Promise.all([
    getUserVotingPreference(id),
    getUserRankedVotes(id),
  ]);

  return (
    <div className="bg-cream-100 min-h-screen">
      <BookClubNav
        bookClubId={meeting.bookClub.id}
        bookClubName={meeting.bookClub.name}
        userName={session.user.name || "User"}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Meeting Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <CardTitle className="text-2xl">
                      {meeting.theme
                        ? meeting.theme.name
                        : "Meeting " + meetingDate.toLocaleDateString()}
                    </CardTitle>
                    {meeting.currentUserIsAdmin && (
                      <>
                        <EditMeetingDialog
                          meetingId={meeting.id}
                          bookClubId={meeting.bookClub.id}
                          currentDate={meeting.meetingDate}
                          currentNominationDeadline={
                            meeting.nominationDeadline || null
                          }
                          currentVotingDeadline={meeting.votingDeadline || null}
                          currentTheme={meeting.theme?.name || null}
                          currentDetails={meeting.details || null}
                          currentBook={meeting.selectedBook || null}
                        />
                        <DeleteMeetingButton
                          meetingId={meeting.id}
                          bookClubId={meeting.bookClub.id}
                          meetingName={
                            meeting.theme
                              ? meeting.theme.name
                              : "Meeting " + meetingDate.toLocaleDateString()
                          }
                        />
                      </>
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
                    {nominationsOpen && nominationDeadline && (
                      <p className="text-dark-500 text-sm">
                        Nominations close:{" "}
                        {nominationDeadline.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                    {votingOpen && votingDeadline && (
                      <p className="text-dark-500 text-sm">
                        Voting closes:{" "}
                        {votingDeadline.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                    {meeting.details && (
                      <div className="bg-cream-100 border-gold-600/20 mt-3 rounded-lg border p-3">
                        <p className="text-dark-900 text-sm whitespace-pre-wrap">
                          {meeting.details}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {meeting.isFinalized ? (
                    <span className="bg-rust-100 text-cream-100 font-inria rounded-full px-3 py-1 text-sm font-medium">
                      Finalized
                    </span>
                  ) : nominationsOpen ? (
                    <span className="text-dark-900 font-inria rounded-full bg-blue-100 px-3 py-1 text-sm font-medium">
                      Nominations Open
                    </span>
                  ) : votingOpen ? (
                    <span className="bg-gold-100 text-dark-900 font-inria rounded-full px-3 py-1 text-sm font-medium">
                      Voting Open
                    </span>
                  ) : isPast ? (
                    <span className="bg-cream-200 text-dark-600 font-inria rounded-full px-3 py-1 text-sm font-medium">
                      Past
                    </span>
                  ) : null}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Nomination Form - Only show during nomination phase */}
          {nominationsOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="font-inria text-dark-900 text-xl">
                  Nominate a Book
                </CardTitle>
                {nominationDeadline && (
                  <p className="text-dark-600 mt-2 text-sm">
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

          {/* Book Options - Show during voting, after voting closes, or after finalized */}
          {(votingOpen || !nominationsOpen || meeting.isFinalized) &&
            meeting.bookOptions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {votingOpen
                      ? "Vote for a Book"
                      : meeting.isFinalized
                        ? "Book Options"
                        : "Voting Results"}
                    {meeting.bookOptions.length > 0 && (
                      <span className="text-dark-500 ml-2 text-base font-normal">
                        ({meeting.bookOptions.length})
                      </span>
                    )}
                  </CardTitle>
                  {votingOpen && votingDeadline && (
                    <p className="text-dark-600 mt-2 text-sm">
                      Voting closes{" "}
                      {votingDeadline.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <BookOptionsList
                    bookOptions={meeting.bookOptions}
                    isFinalized={meeting.isFinalized}
                    selectedBookId={meeting.selectedBookId}
                    currentUserIsAdmin={meeting.currentUserIsAdmin}
                    meetingId={meeting.id}
                    isVotingOpen={votingOpen || false}
                    userVotingMethod={userVotingMethod}
                    userRankedVotes={userRankedVotes}
                  />
                </CardContent>
              </Card>
            )}
        </div>
      </main>
    </div>
  );
}
