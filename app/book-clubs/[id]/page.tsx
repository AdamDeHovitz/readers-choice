import { auth } from "@/auth";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import {
  getBookClubState,
  getUpcomingMeeting,
  getBookClubMeetings,
} from "@/app/actions/meetings";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { HeroSection } from "@/components/book-clubs/hero-section";
import { BookDisplay } from "@/components/book-clubs/book-display";
import { redirect } from "next/navigation";

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

  // Get book club state and determine what to show
  const stateResult = await getBookClubState(id);
  const state = stateResult.state;

  let upcomingMeeting = null;

  if (state === "nominating" || state === "voting") {
    upcomingMeeting = await getUpcomingMeeting(id);
  }

  // Get all finalized meetings to display the correct book
  const allMeetings = await getBookClubMeetings(id);
  const now = new Date();

  // Filter finalized meetings with selected books
  const finalizedMeetings = allMeetings.filter(
    (m) => m.isFinalized && m.selectedBookId
  );

  // Determine what book to display
  let bookToDisplay = null;
  let bookMeeting: { id: string; meetingDate: string; isFinalized: boolean } | undefined = undefined;
  let bookLabel: "Current Book" | "Previous Book" | "Upcoming" = "Current Book";

  if (finalizedMeetings.length > 0) {
    // First, check for upcoming finalized meetings
    const upcomingFinalizedMeetings = finalizedMeetings.filter(
      (m) => new Date(m.meetingDate) > now
    );

    let meetingToDisplay;
    if (upcomingFinalizedMeetings.length > 0) {
      // Show the next upcoming finalized meeting
      meetingToDisplay = upcomingFinalizedMeetings.sort(
        (a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime()
      )[0];
      bookLabel = "Upcoming";
    } else {
      // Show the most recent past finalized meeting
      meetingToDisplay = finalizedMeetings.sort(
        (a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()
      )[0];
      bookLabel = "Previous Book";
    }

    if (meetingToDisplay.selectedBook) {
      bookToDisplay = {
        id: meetingToDisplay.selectedBook.id,
        title: meetingToDisplay.selectedBook.title,
        author: meetingToDisplay.selectedBook.author,
        coverUrl: meetingToDisplay.selectedBook.coverUrl,
      };
      bookMeeting = {
        id: meetingToDisplay.id,
        meetingDate: meetingToDisplay.meetingDate,
        isFinalized: true,
      };
    }
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <BookClubNav
        bookClubId={id}
        bookClubName={bookClub.name}
        userName={session.user.name || "User"}
      />

      <HeroSection
        bookClubId={id}
        bookClubName={bookClub.name}
        state={state}
        meetingId={upcomingMeeting?.id}
        meetingDate={upcomingMeeting?.meeting_date}
        themeName={
          upcomingMeeting?.theme &&
          Array.isArray(upcomingMeeting.theme) &&
          upcomingMeeting.theme[0]?.name
            ? upcomingMeeting.theme[0].name
            : undefined
        }
        nominationDeadline={upcomingMeeting?.nomination_deadline || undefined}
        votingDeadline={upcomingMeeting?.voting_deadline || undefined}
      />

      <BookDisplay
        state={state}
        book={bookToDisplay}
        meeting={bookMeeting}
        label={bookLabel}
      />
    </div>
  );
}
