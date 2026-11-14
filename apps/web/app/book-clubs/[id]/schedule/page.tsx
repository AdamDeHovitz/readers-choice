import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadPageData } from "@/app/_operations/page-data";
import { listClubMeetings } from "@/server/operations/meetings";
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
  const { id: bookClubId } = await params;
  // Non-members land on the club page, which offers to join.
  const { club, canSchedule, meetings } = await loadPageData(
    listClubMeetings,
    { bookClubId },
    { onRefused: () => redirect(`/book-clubs/${bookClubId}`) }
  );

  return (
    <>
      <PageHeader
        title="Schedule"
        description={`${meetings.length} ${meetings.length === 1 ? "meeting" : "meetings"}`}
        actions={
          <>
            {canSchedule && (
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
              bookClubName={club.name}
            />
          </>
        }
      />
      <MeetingTimeline meetings={meetings} />
    </>
  );
}
