import { CalendarDaysIcon, ClockIcon } from "lucide-react";
import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { PageHeader, Section } from "@/components/ui/page-header";
import { EditMeetingDialog } from "@/components/meetings/edit-meeting-dialog";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { BookOptionsList } from "@/components/meetings/book-options-list";
import { NominationForm } from "@/components/nominations/nomination-form";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  BookAvailability,
  BookAvailabilityFallback,
} from "@/components/libraries/book-availability";
import { getMeetingPhase } from "@/lib/meeting-schedule";
import { getMyLibraries } from "@/server/libraries";
import { getMeetingDetails } from "@/server/meetings";
import { getViewer } from "@/server/viewer";
import {
  calculateMeetingResults,
  getUserRankedVotes,
  getUserVotingPreference,
} from "@/server/voting";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [viewer, { id }] = await Promise.all([getViewer(), params]);
  if (!viewer) {
    redirect("/login");
  }

  const meeting = await getMeetingDetails(viewer, id);

  if (!meeting) {
    redirect("/dashboard");
  }

  const meetingDate = new Date(meeting.meetingDate);

  // Determine meeting phase
  const nominationDeadline = meeting.nominationDeadline
    ? new Date(meeting.nominationDeadline)
    : null;
  const votingDeadline = meeting.votingDeadline
    ? new Date(meeting.votingDeadline)
    : null;

  // Same deadline rules the server actions enforce.
  const phase = getMeetingPhase(meeting);
  const nominationsOpen = phase === "nominating";
  const votingOpen = phase === "voting";

  // Fetch the user's ballot, libraries and (once closed) results in parallel
  const [userVotingMethod, userRankedVotes, libraries, votingResults] =
    await Promise.all([
      getUserVotingPreference(viewer, id),
      getUserRankedVotes(viewer, id),
      votingOpen ? getMyLibraries(viewer) : [],
      // Once voting closes, show results until an admin finalizes.
      phase === "awaiting_finalization"
        ? calculateMeetingResults(viewer.db, id, viewer.userId)
        : null,
    ]);

  // Library availability streams in per book, so slow lookups never hold up
  // the ballot. With no libraries chosen, each book offers to set them up.
  const availability: Record<string, ReactNode> | undefined = votingOpen
    ? Object.fromEntries(
        meeting.bookOptions.map((option) => [
          option.id,
          <Suspense key={option.id} fallback={<BookAvailabilityFallback />}>
            <BookAvailability
              title={option.book.title}
              author={option.book.author}
              libraries={libraries}
            />
          </Suspense>,
        ])
      )
    : undefined;

  const title = meeting.theme
    ? meeting.theme.name
    : "Meeting " + meetingDate.toLocaleDateString();
  const shortDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          className="mb-0"
          eyebrow={<MeetingStatusBadge meeting={meeting} />}
          title={title}
          description={
            <>
              <p className="flex items-center gap-2">
                <CalendarDaysIcon className="size-4 shrink-0" aria-hidden />
                {meetingDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {nominationsOpen && nominationDeadline && (
                <p className="flex items-center gap-2">
                  <ClockIcon className="size-4 shrink-0" aria-hidden />
                  Nominations close {shortDate(nominationDeadline)}
                </p>
              )}
              {votingOpen && votingDeadline && (
                <p className="flex items-center gap-2">
                  <ClockIcon className="size-4 shrink-0" aria-hidden />
                  Voting closes {shortDate(votingDeadline)}
                </p>
              )}
            </>
          }
          actions={
            meeting.currentUserIsAdmin && (
              <div className="flex gap-2">
                <EditMeetingDialog
                  meetingId={meeting.id}
                  bookClubId={meeting.bookClub.id}
                  currentDate={meeting.meetingDate}
                  currentNominationDeadline={meeting.nominationDeadline || null}
                  currentVotingDeadline={meeting.votingDeadline || null}
                  currentTheme={meeting.theme?.name || null}
                  currentDetails={meeting.details || null}
                  currentBook={meeting.selectedBook || null}
                />
                <DeleteMeetingButton
                  meetingId={meeting.id}
                  bookClubId={meeting.bookClub.id}
                  meetingName={title}
                />
              </div>
            )
          }
        />
        {meeting.details && (
          <blockquote className="bg-card border-border mt-4 rounded-2xl border p-4 text-sm">
            <p className="text-foreground mb-1 font-bold">From the host</p>
            <p className="text-dark-700 whitespace-pre-wrap">
              {meeting.details}
            </p>
          </blockquote>
        )}
      </div>

      {/* Nomination Form - Only show during nomination phase */}
      {nominationsOpen && (
        <Section
          title="Nominate a book"
          description="Search for a book and add a note about why you picked it."
        >
          <NominationForm
            meetingId={meeting.id}
            existingNominations={meeting.bookOptions}
            currentUserId={viewer.userId}
          />
        </Section>
      )}

      {/* Book Options - Show during voting, after voting closes, or after finalized */}
      {(votingOpen || !nominationsOpen || meeting.isFinalized) &&
        meeting.bookOptions.length > 0 && (
          <Section
            title={
              votingOpen
                ? "Vote for a book"
                : meeting.isFinalized
                  ? "Book options"
                  : "Voting results"
            }
            description={`${meeting.bookOptions.length} ${meeting.bookOptions.length === 1 ? "book" : "books"}`}
          >
            <BookOptionsList
              bookOptions={meeting.bookOptions}
              isFinalized={meeting.isFinalized}
              selectedBookId={meeting.selectedBookId}
              currentUserIsAdmin={meeting.currentUserIsAdmin}
              meetingId={meeting.id}
              isVotingOpen={votingOpen}
              userVotingMethod={userVotingMethod}
              userRankedVotes={userRankedVotes}
              votingResults={votingResults}
              availability={availability}
            />
          </Section>
        )}
    </div>
  );
}
