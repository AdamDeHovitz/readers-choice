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
import { JoinClubButton } from "@/components/book-clubs/join-club-button";
import { redirect } from "next/navigation";

export default async function BookClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  // Parallelize initial queries
  const [bookClub, stateResult, allMeetings] = await Promise.all([
    getBookClubDetails(id),
    getBookClubState(id),
    getBookClubMeetings(id),
  ]);

  if (!bookClub) {
    redirect("/browse");
  }

  // If not logged in or not a member, show limited view with join button
  if (!session?.user || !bookClub.currentUserIsMember) {
    return (
      <div className="min-h-screen bg-cream-100">
        <header className="bg-cream-100 border-b border-gold-600/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-4xl font-voga text-dark-900 uppercase tracking-wider">
              {bookClub.name}
            </h1>
            {bookClub.description && (
              <p className="text-dark-600 mt-2 font-inria">
                {bookClub.description}
              </p>
            )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border border-gold-600/20 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-inria font-semibold text-dark-900 mb-4">
              {session?.user ? "Join this book club" : "Sign in to join"}
            </h2>
            <p className="text-dark-600 mb-6 font-inria">
              {session?.user
                ? `Join ${bookClub.name} to see meetings, vote on books, and participate in discussions.`
                : "Sign in to join this book club and start reading with the community."}
            </p>
            {session?.user ? (
              <JoinClubButton bookClubId={id} />
            ) : (
              <a href="/login" className="inline-block">
                <button className="bg-rust-600 text-cream-100 border-2 border-dark-900 px-6 py-3 rounded-lg font-medium font-inria hover:bg-rust-700 transition-colors">
                  Sign In
                </button>
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Extract state and fetch upcoming meeting if needed
  const state = stateResult.state;
  const now = new Date();

  let upcomingMeeting = null;
  if (state === "nominating" || state === "voting") {
    upcomingMeeting = await getUpcomingMeeting(id);
  }

  // Filter finalized meetings with selected books
  const finalizedMeetings = allMeetings.filter(
    (m) => m.isFinalized && m.selectedBookId
  );

  // Determine what book to display
  let bookToDisplay = null;
  let bookMeeting: { id: string; meetingDate: string; isFinalized: boolean; themeName?: string | null; details?: string | null } | undefined = undefined;
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
        description: meetingToDisplay.selectedBook.description,
        pageCount: meetingToDisplay.selectedBook.pageCount,
        publishedYear: meetingToDisplay.selectedBook.publishedYear,
      };
      bookMeeting = {
        id: meetingToDisplay.id,
        meetingDate: meetingToDisplay.meetingDate,
        isFinalized: true,
        themeName: meetingToDisplay.theme?.name,
        details: meetingToDisplay.details,
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
