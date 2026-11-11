import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getBookClubMeetings } from "@/server/meetings";
import { getViewer } from "@/server/viewer";
import { MeetingTimeline } from "@/components/meetings/meeting-timeline";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { LogPastMeetingDialog } from "@/components/meetings/log-past-meeting-dialog";
import { SubscribeCalendarDialog } from "@/components/meetings/subscribe-calendar-dialog";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Schedule" };

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
    <>
      <PageHeader
        title="Schedule"
        description={`${meetings.length} ${meetings.length === 1 ? "meeting" : "meetings"}`}
        actions={
          bookClub.currentUserIsMember && (
            <>
              {bookClub.currentUserIsAdmin && (
                <>
                  <CreateMeetingDialog
                    bookClubId={bookClubId}
                    pastMeetings={meetings.slice(0, 2).map((meeting) => ({
                      meetingDate: meeting.meetingDate,
                      nominationDeadline: meeting.nominationDeadline,
                      votingDeadline: meeting.votingDeadline,
                    }))}
                  />
                  <LogPastMeetingDialog bookClubId={bookClubId} />
                </>
              )}
              <SubscribeCalendarDialog
                bookClubId={bookClubId}
                bookClubName={bookClub.name}
              />
            </>
          )
        }
      />
      <MeetingTimeline meetings={meetings} />
    </>
  );
}
