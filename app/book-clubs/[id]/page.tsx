import {
  getClubStatus,
  pickFeaturedMeeting,
  pickUpcomingMeeting,
} from "@/lib/meeting-schedule";
import { getBookClubDetails } from "@/server/clubs";
import { getBookClubMeetings } from "@/server/meetings";
import { getViewer } from "@/server/viewer";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { HeroSection } from "@/components/book-clubs/hero-section";
import { BookDisplay } from "@/components/book-clubs/book-display";
import { redirect } from "next/navigation";

export default async function BookClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [viewer, { id }] = await Promise.all([getViewer(), params]);

  const [bookClub, meetings] = await Promise.all([
    getBookClubDetails(viewer, id),
    viewer ? getBookClubMeetings(viewer, id) : [],
  ]);

  if (!bookClub) {
    redirect("/browse");
  }

  // If not logged in or not a member, show a limited view. Joining requires an
  // invite link from a club admin.
  if (!viewer || !bookClub.currentUserIsMember) {
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
            {!viewer && (
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

  const now = new Date();
  const upcomingMeeting = pickUpcomingMeeting(meetings, now);
  const featured = pickFeaturedMeeting(
    meetings.filter((m) => m.selectedBook),
    now
  );

  return (
    <div className="bg-cream-100 min-h-screen">
      <BookClubNav
        bookClubId={id}
        bookClubName={bookClub.name}
        userName={viewer.name}
      />

      <HeroSection
        bookClubId={id}
        bookClubName={bookClub.name}
        state={getClubStatus(upcomingMeeting, now)}
        meetingId={upcomingMeeting?.id}
        meetingDate={upcomingMeeting?.meetingDate}
        themeName={upcomingMeeting?.theme?.name}
        nominationDeadline={upcomingMeeting?.nominationDeadline ?? undefined}
        votingDeadline={upcomingMeeting?.votingDeadline ?? undefined}
      />

      <BookDisplay
        book={featured?.meeting.selectedBook ?? null}
        meeting={
          featured
            ? {
                id: featured.meeting.id,
                meetingDate: featured.meeting.meetingDate,
                isFinalized: true,
                themeName: featured.meeting.theme?.name,
                details: featured.meeting.details,
              }
            : undefined
        }
        label={featured?.label ?? "Current Book"}
      />
    </div>
  );
}
