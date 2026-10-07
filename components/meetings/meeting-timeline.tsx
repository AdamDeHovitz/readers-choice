import Link from "next/link";
import { BookCover } from "@/components/books/book-cover";
import { Card, CardContent } from "@/components/ui/card";

interface Meeting {
  id: string;
  meetingDate: string;
  nominationDeadline?: string | null;
  votingDeadline: string | null;
  isFinalized: boolean;
  theme: {
    id: string;
    name: string;
  } | null;
  selectedBook: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  } | null;
}

interface MeetingTimelineProps {
  meetings: Meeting[];
}

export function MeetingTimeline({ meetings }: MeetingTimelineProps) {
  if (meetings.length === 0) {
    return (
      <p className="text-dark-500 py-8 text-center italic">
        No meetings scheduled yet
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => {
        const meetingDate = new Date(meeting.meetingDate);
        const now = new Date();
        const isPast = meetingDate < now;
        const isUpcoming = !isPast && !meeting.isFinalized;

        // Determine phase for upcoming meetings
        const nominationDeadline = meeting.nominationDeadline
          ? new Date(meeting.nominationDeadline)
          : null;
        const isNominating =
          isUpcoming && (!nominationDeadline || nominationDeadline > now);
        const isVoting =
          isUpcoming && nominationDeadline && nominationDeadline <= now;

        return (
          <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Date Badge */}
                  <div className="flex-shrink-0">
                    <div
                      className={`flex h-16 w-16 flex-col items-center justify-center rounded-lg ${
                        isUpcoming
                          ? "bg-gold-600 text-dark-900"
                          : isPast && meeting.isFinalized
                            ? "bg-rust-600 text-cream-100"
                            : "bg-cream-200 text-dark-900"
                      }`}
                    >
                      <div className="font-inria text-xs font-medium uppercase">
                        {meetingDate.toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </div>
                      <div className="font-inria text-2xl font-bold">
                        {meetingDate.getDate()}
                      </div>
                    </div>
                  </div>

                  {/* Meeting Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-inria text-dark-900 font-medium">
                          {meeting.theme
                            ? meeting.theme.name
                            : meetingDate.toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                              })}
                        </h3>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {meeting.isFinalized ? (
                          <span className="bg-rust-600 text-cream-100 font-inria rounded-full px-2 py-1 text-xs font-medium">
                            Finalized
                          </span>
                        ) : isNominating ? (
                          <span className="bg-gold-100 text-dark-900 font-inria rounded-full px-2 py-1 text-xs font-medium">
                            Nominations Open
                          </span>
                        ) : isVoting ? (
                          <span className="bg-gold-600 text-dark-900 font-inria rounded-full px-2 py-1 text-xs font-medium">
                            Voting Open
                          </span>
                        ) : isPast ? (
                          <span className="bg-cream-200 text-dark-600 font-inria rounded-full px-2 py-1 text-xs font-medium">
                            Past
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Selected Book */}
                    {meeting.selectedBook && (
                      <div className="bg-cream-100 mt-3 flex items-center gap-3 rounded-lg p-2">
                        <BookCover
                          coverUrl={meeting.selectedBook.coverUrl}
                          title={meeting.selectedBook.title}
                          size="xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-inria text-dark-900 truncate text-sm font-medium">
                            {meeting.selectedBook.title}
                          </p>
                          <p className="text-dark-600 truncate text-xs">
                            by {meeting.selectedBook.author}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
