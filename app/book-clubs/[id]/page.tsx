import { auth } from "@/auth";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import { getBookClubState, getBookClubMeetings } from "@/app/actions/meetings";
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

  // Parallelize initial queries
  const [bookClub, stateResult, allMeetings] = await Promise.all([
    getBookClubDetails(id),
    getBookClubState(id),
    getBookClubMeetings(id),
  ]);

  if (!bookClub) {
    redirect("/browse");
  }

  // If not logged in or not a member, show a limited view. Joining requires an
  // invite link from a club admin.
  if (!session?.user || !bookClub.currentUserIsMember) {
    return (
      <div className="bg-cream-100 min-h-screen">
        <header className="bg-cream-100 border-gold-600/20 border-b">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="font-voga text-dark-900 text-4xl tracking-wider uppercase">
              {bookClub.name}
            </h1>
            {bookClub.description && (
              <p className="text-dark-600 font-inria mt-2">
                {bookClub.description}
              </p>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="border-gold-600/20 rounded-lg border bg-white p-8 text-center">
            <h2 className="font-inria text-dark-900 mb-4 text-2xl font-semibold">
              Invite required
            </h2>
            <p className="text-dark-600 font-inria mb-6">
              {bookClub.name} is invite-only. Ask a club admin for an invite
              link to join and see meetings, vote on books, and participate in
              discussions.
            </p>
            {!session?.user && (
              <a href="/login" className="inline-block">
                <button className="bg-rust-600 text-cream-100 border-dark-900 font-inria hover:bg-rust-700 rounded-lg border-2 px-6 py-3 font-medium transition-colors">
                  Sign In
                </button>
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Extract state and use the meeting data already returned by getBookClubState
  const state = stateResult.state;
  const upcomingMeeting = stateResult.meeting;
  const now = new Date();

  // Filter finalized meetings with selected books
  const finalizedMeetings = allMeetings.filter(
    (m) => m.isFinalized && m.selectedBookId
  );

  // Determine what book to display
  let bookToDisplay = null;
  let bookMeeting:
    | {
        id: string;
        meetingDate: string;
        isFinalized: boolean;
        themeName?: string | null;
        details?: string | null;
      }
    | undefined = undefined;
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
        (a, b) =>
          new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime()
      )[0];
      bookLabel = "Upcoming";
    } else {
      // Show the most recent past finalized meeting
      meetingToDisplay = finalizedMeetings.sort(
        (a, b) =>
          new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()
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
    <div className="bg-cream-100 min-h-screen">
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
        book={bookToDisplay}
        meeting={bookMeeting}
        label={bookLabel}
      />
    </div>
  );
}
