import Link from "next/link";
import { CalendarDaysIcon, ChevronRightIcon } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/page-header";
import { LocalDate } from "@/components/ui/local-date";
import { cn } from "@/lib/utils";
import type { MeetingSummary } from "@/server/meetings";
import { MeetingStatusBadge } from "./meeting-status-badge";

/** The club's meetings, split into upcoming (soonest first) and past. */
export function MeetingTimeline({
  meetings,
  now = new Date(),
}: {
  meetings: MeetingSummary[];
  now?: Date;
}) {
  if (meetings.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDaysIcon />}
        title="No meetings yet"
        description="Scheduled meetings will show up here."
      />
    );
  }

  const time = (m: MeetingSummary) => new Date(m.meetingDate).getTime();
  const upcoming = meetings
    .filter((m) => time(m) >= now.getTime())
    .sort((a, b) => time(a) - time(b));
  const past = meetings
    .filter((m) => time(m) < now.getTime())
    .sort((a, b) => time(b) - time(a));

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <Section title="Upcoming">
          <MeetingList meetings={upcoming} highlight />
        </Section>
      )}
      {past.length > 0 && (
        <Section title="Past">
          <MeetingList meetings={past} />
        </Section>
      )}
    </div>
  );
}

function MeetingList({
  meetings,
  highlight = false,
}: {
  meetings: MeetingSummary[];
  highlight?: boolean;
}) {
  return (
    <ul className="bg-card border-border divide-border divide-y overflow-hidden rounded-2xl border shadow-xs">
      {meetings.map((meeting) => {
        const book = meeting.selectedBook;
        return (
          <li key={meeting.id}>
            <Link
              href={`/meetings/${meeting.id}`}
              className="hover:bg-muted/50 active:bg-muted flex items-center gap-3 p-3 sm:p-4"
            >
              <div
                className={cn(
                  "flex size-14 shrink-0 flex-col items-center justify-center rounded-xl",
                  highlight
                    ? "bg-sage-200 text-sage-800"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span className="text-[11px] font-bold uppercase">
                  <LocalDate iso={meeting.meetingDate} format="shortMonth" />
                </span>
                <span className="text-foreground text-xl leading-none font-bold">
                  <LocalDate iso={meeting.meetingDate} format="day" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate font-bold">
                  {meeting.theme?.name ?? (
                    <LocalDate iso={meeting.meetingDate} format="monthYear" />
                  )}
                </p>
                {book ? (
                  <p className="text-muted-foreground truncate text-sm">
                    {book.title}{" "}
                    <span className="text-dark-500">by {book.author}</span>
                  </p>
                ) : (
                  <MeetingStatusBadge meeting={meeting} className="mt-1" />
                )}
              </div>

              {book && (
                <BookCover
                  coverUrl={book.coverUrl}
                  title={book.title}
                  size="xs"
                />
              )}
              <ChevronRightIcon
                className="text-dark-500 size-5 shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
