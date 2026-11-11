import { buildIcsCalendar, type IcsEvent } from "./ics";

/** Meetings have no end time, so every event gets this length. */
export const MEETING_DURATION_MINUTES = 120;

/** Feeds include meetings this far back, plus every upcoming one. */
export const FEED_HISTORY_DAYS = 180;

export interface CalendarMeeting {
  id: string;
  meetingDate: string;
  updatedAt: string | null;
  isFinalized: boolean;
  details: string | null;
  themeName: string | null;
  book: { title: string; author: string | null } | null;
}

export interface ClubCalendarInput {
  clubName: string;
  meetings: CalendarMeeting[];
  /** The app's origin, e.g. https://example.com, for links back to meetings. */
  baseUrl: string;
  now?: Date;
}

function meetingSummary(clubName: string, meeting: CalendarMeeting): string {
  if (meeting.book) return `${clubName}: ${meeting.book.title}`;
  return `${clubName} (book TBD)`;
}

function meetingDescription(meeting: CalendarMeeting, url: string): string {
  const parts: string[] = [];
  if (meeting.book) {
    parts.push(
      meeting.book.author
        ? `${meeting.book.title} by ${meeting.book.author}`
        : meeting.book.title
    );
  } else if (!meeting.isFinalized) {
    parts.push("The book hasn't been picked yet.");
  }
  if (meeting.themeName) parts.push(`Theme: ${meeting.themeName}`);
  if (meeting.details?.trim()) parts.push(meeting.details.trim());
  parts.push(url);
  return parts.join("\n\n");
}

export function meetingEvent(
  clubName: string,
  meeting: CalendarMeeting,
  baseUrl: string
): IcsEvent {
  const start = new Date(meeting.meetingDate);
  const url = `${baseUrl}/meetings/${meeting.id}`;
  return {
    uid: `meeting-${meeting.id}@readers-choice`,
    start,
    end: new Date(start.getTime() + MEETING_DURATION_MINUTES * 60_000),
    summary: meetingSummary(clubName, meeting),
    description: meetingDescription(meeting, url),
    url,
    lastModified: meeting.updatedAt ? new Date(meeting.updatedAt) : undefined,
  };
}

/** A club's meetings as a subscribable iCalendar feed. */
export function buildClubCalendar({
  clubName,
  meetings,
  baseUrl,
  now,
}: ClubCalendarInput): string {
  return buildIcsCalendar({
    name: clubName,
    refreshIntervalHours: 6,
    events: meetings.map((meeting) => meetingEvent(clubName, meeting, baseUrl)),
    now,
  });
}

/** The earliest meeting date a feed includes. */
export function feedHistoryStart(now: Date): Date {
  return new Date(now.getTime() - FEED_HISTORY_DAYS * 24 * 60 * 60_000);
}

/**
 * Links that subscribe to a feed. Calendar apps fetch `webcal://` URLs over
 * HTTPS; Google's `cid` parameter opens its "add calendar" dialog.
 */
export function calendarSubscribeLinks(feedUrl: string): {
  webcal: string;
  google: string;
} {
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  return {
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}
