import { auth } from "@/auth";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import {
  getBookClubState,
  getUpcomingMeeting,
  getLatestFinalizedMeeting,
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

  // Get the latest finalized meeting to display (regardless of voting state)
  const latestFinalizedMeeting = await getLatestFinalizedMeeting(id);

  // Determine what book to display
  let bookToDisplay = null;
  let bookMeeting = null;
  let bookLabel: "Current Book" | "Previous Book" | "Upcoming" = "Current Book";

  if (latestFinalizedMeeting?.selected_book) {
    bookToDisplay = {
      id: latestFinalizedMeeting.selected_book.id,
      title: latestFinalizedMeeting.selected_book.title,
      author: latestFinalizedMeeting.selected_book.author,
      coverUrl: latestFinalizedMeeting.selected_book.cover_url,
    };
    bookMeeting = {
      id: latestFinalizedMeeting.id,
      meetingDate: latestFinalizedMeeting.meeting_date,
      isFinalized: true,
    };

    // Determine label based on whether the meeting date has passed
    const meetingDate = new Date(latestFinalizedMeeting.meeting_date);
    const now = new Date();

    if (meetingDate > now) {
      bookLabel = "Upcoming";
    } else {
      bookLabel = "Previous Book";
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
        themeName={upcomingMeeting?.theme?.name}
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
