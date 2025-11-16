import Link from "next/link";
import Image from "next/image";
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
      <p className="text-dark-500 italic text-center py-8">
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
          isUpcoming &&
          (!nominationDeadline || nominationDeadline > now);
        const isVoting =
          isUpcoming &&
          nominationDeadline &&
          nominationDeadline <= now;

        return (
          <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Date Badge */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center ${
                        isUpcoming
                          ? "bg-gold-600 text-dark-900"
                          : isPast && meeting.isFinalized
                            ? "bg-rust-600 text-cream-100"
                            : "bg-cream-200 text-dark-900"
                      }`}
                    >
                      <div className="text-xs font-medium font-inria uppercase">
                        {meetingDate.toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </div>
                      <div className="text-2xl font-bold font-inria">
                        {meetingDate.getDate()}
                      </div>
                    </div>
                  </div>

                  {/* Meeting Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium font-inria text-dark-900">
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
                          <span className="text-xs bg-rust-600 text-cream-100 px-2 py-1 rounded-full font-medium font-inria">
                            Finalized
                          </span>
                        ) : isNominating ? (
                          <span className="text-xs bg-blue-100 text-dark-900 px-2 py-1 rounded-full font-medium font-inria">
                            Nominations Open
                          </span>
                        ) : isVoting ? (
                          <span className="text-xs bg-gold-600 text-dark-900 px-2 py-1 rounded-full font-medium font-inria">
                            Voting Open
                          </span>
                        ) : isPast ? (
                          <span className="text-xs bg-cream-200 text-dark-600 px-2 py-1 rounded-full font-medium font-inria">
                            Past
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Selected Book */}
                    {meeting.selectedBook && (
                      <div className="flex items-center gap-3 mt-3 p-2 bg-cream-100 rounded-lg">
                        {meeting.selectedBook.coverUrl ? (
                          <Image
                            src={meeting.selectedBook.coverUrl}
                            alt={meeting.selectedBook.title}
                            width={32}
                            height={48}
                            className="w-8 h-12 object-cover rounded shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-12 bg-cream-200 rounded flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-dark-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium font-inria text-dark-900 truncate">
                            {meeting.selectedBook.title}
                          </p>
                          <p className="text-xs text-dark-600 truncate">
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
