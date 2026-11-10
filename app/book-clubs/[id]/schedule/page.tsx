import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getBookClubMeetings } from "@/server/meetings";
import { getViewer } from "@/server/viewer";
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
  const [viewer, { id: bookClubId }] = await Promise.all([getViewer(), params]);
  if (!viewer) {
    redirect("/login");
  }

  const [bookClub, meetings] = await Promise.all([
    getBookClubDetails(viewer, bookClubId),
    getBookClubMeetings(viewer, bookClubId),
  ]);

  if (!bookClub) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-cream-100 min-h-screen">
      <BookClubNav
        bookClubId={bookClubId}
        bookClubName={bookClub.name}
        userName={viewer.name}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
