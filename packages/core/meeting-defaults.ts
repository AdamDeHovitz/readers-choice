/**
 * Suggested values for a new meeting's form, from the club's history: the
 * next meeting at the club's usual cadence and time, with deadlines the same
 * number of days before it as last time. Works in local time, so call it in
 * the browser.
 */
import {
  splitDateTimeInput,
  toDateInput,
  toDateTimeInput,
} from "./datetime-input";

export interface PastMeetingSchedule {
  meetingDate: string;
  nominationDeadline: string | null;
  votingDeadline: string | null;
}

/** Form values as local "YYYY-MM-DDTHH:mm" strings; blank when unknown. */
export interface MeetingScheduleDefaults {
  meetingDate: string;
  nominationDeadline: string;
  votingDeadline: string;
  /** "HH:mm" to use when someone picks a meeting date. */
  meetingTime: string;
}

export const DEFAULT_MEETING_TIME = "19:00";

/** Gaps outside this range look like one-offs, not a cadence. */
const MIN_CADENCE_DAYS = 7;
const MAX_CADENCE_DAYS = 92;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from `a` to `b` in local time (DST-safe). */
function calendarDaysBetween(a: Date, b: Date): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(b) - utc(a)) / DAY_MS);
}

/** Same local time of day as `time`, `days` calendar days after `date`. */
function shiftDays(date: Date, days: number, time: Date = date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    time.getHours(),
    time.getMinutes()
  );
}

/**
 * @param meetings the club's meetings, newest first
 */
export function suggestMeetingSchedule(
  meetings: readonly PastMeetingSchedule[],
  now: Date = new Date()
): MeetingScheduleDefaults {
  const blank = {
    meetingDate: "",
    nominationDeadline: "",
    votingDeadline: "",
  };
  const [latest, previous] = meetings;
  if (!latest) return { ...blank, meetingTime: DEFAULT_MEETING_TIME };

  const latestDate = new Date(latest.meetingDate);
  const meetingTime = splitDateTimeInput(
    toDateTimeInput(latest.meetingDate)
  ).time;
  if (!previous) return { ...blank, meetingTime };

  const cadence = calendarDaysBetween(
    new Date(previous.meetingDate),
    latestDate
  );
  if (cadence < MIN_CADENCE_DAYS || cadence > MAX_CADENCE_DAYS) {
    return { ...blank, meetingTime };
  }

  // The first meeting on the cadence after both the latest one and today.
  const periods = Math.max(
    1,
    Math.ceil(calendarDaysBetween(latestDate, now) / cadence)
  );
  let next = shiftDays(latestDate, periods * cadence);
  if (next <= now) next = shiftDays(next, cadence);

  // A deadline the same number of days before as last time, at the same time.
  const deadline = (iso: string | null): string => {
    if (!iso) return "";
    const last = new Date(iso);
    const daysBefore = calendarDaysBetween(last, latestDate);
    const shifted = shiftDays(next, -daysBefore, last);
    return shifted > now ? toDateTimeInput(shifted.toISOString()) : "";
  };

  return {
    meetingDate: `${toDateInput(next)}T${meetingTime}`,
    nominationDeadline: deadline(latest.nominationDeadline),
    votingDeadline: deadline(latest.votingDeadline),
    meetingTime,
  };
}
