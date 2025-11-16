import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import { getBookClubMeetings } from "@/app/actions/meetings";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { MeetingTimeline } from "@/components/meetings/meeting-timeline";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { LogPastMeetingDialog } from "@/components/meetings/log-past-meeting-dialog";
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
                <CardTitle className="text-2xl">Schedule</CardTitle>
                <p className="text-dark-600 mt-1">
                  {meetings.length}{" "}
                  {meetings.length === 1 ? "meeting" : "meetings"}
                </p>
              </div>
              {bookClub.currentUserIsAdmin && (
                <div className="flex gap-2">
                  <LogPastMeetingDialog bookClubId={bookClubId} />
                  <CreateMeetingDialog bookClubId={bookClubId} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <MeetingTimeline meetings={meetings} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
