import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import { getBookClubMeetings } from "@/app/actions/meetings";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { MeetingTimeline } from "@/components/meetings/meeting-timeline";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id: bookClubId } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  const [bookClub, meetings] = await Promise.all([
    getBookClubDetails(bookClubId),
    getBookClubMeetings(bookClubId),
  ]);

  if (!bookClub) {
    redirect("/dashboard");
  }

  // Filter to show only upcoming meetings
  const upcomingMeetings = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.meetingDate);
    return meetingDate >= new Date() || !meeting.isFinalized;
  });

  return (
    <div className="min-h-screen bg-cream-100">
      <BookClubNav
        bookClubId={bookClubId}
        bookClubName={bookClub.name}
        userName={session.user.name || "User"}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Upcoming Schedule</CardTitle>
                <p className="text-dark-600 mt-1">
                  {upcomingMeetings.length}{" "}
                  {upcomingMeetings.length === 1
                    ? "upcoming meeting"
                    : "upcoming meetings"}
                </p>
              </div>
              {bookClub.currentUserIsAdmin && (
                <CreateMeetingDialog bookClubId={bookClubId} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length > 0 ? (
              <MeetingTimeline meetings={upcomingMeetings} />
            ) : (
              <div className="text-center py-12">
                <p className="text-dark-600">
                  No upcoming meetings scheduled.
                  {bookClub.currentUserIsAdmin &&
                    " Click the button above to schedule one!"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
