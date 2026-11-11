/**
 * A minimal iCalendar (RFC 5545) writer for subscribable feeds. Only what a
 * read-only feed of timed events needs: no recurrence, attendees or alarms.
 */

export interface IcsEvent {
  /** Globally unique and stable across fetches, so edits update in place. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  url?: string;
  lastModified?: Date;
}

export interface IcsCalendar {
  /** Shown as the calendar's name when someone subscribes. */
  name: string;
  /** How often clients should re-fetch. Apple honors this; Google ignores it. */
  refreshIntervalHours: number;
  events: IcsEvent[];
  /** Generation time, for DTSTAMP. Defaults to now. */
  now?: Date;
}

const PRODUCT_ID = "-//Readers' Choice//Book Club Calendar//EN";

/** UTC date-time in iCalendar's basic format, e.g. 20261110T190000Z. */
export function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escape a TEXT value (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n?|\n/g, "\\n");
}

const MAX_LINE_OCTETS = 75;

/**
 * Fold a content line at 75 octets (RFC 5545 §3.1). Continuation lines start
 * with a space, which counts toward their length. Never splits a UTF-8
 * character.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;
  for (const char of line) {
    const octets = encoder.encode(char).length;
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (currentOctets + octets > limit) {
      parts.push(current);
      current = "";
      currentOctets = 0;
    }
    current += char;
    currentOctets += octets;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function eventLines(event: IcsEvent, stamp: string): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  // URI values aren't TEXT, so they aren't escaped.
  if (event.url) lines.push(`URL:${event.url}`);
  if (event.lastModified) {
    lines.push(`LAST-MODIFIED:${formatIcsDate(event.lastModified)}`);
  }
  lines.push("END:VEVENT");
  return lines;
}

/** Serialize a calendar, with CRLF line endings as the spec requires. */
export function buildIcsCalendar(calendar: IcsCalendar): string {
  const stamp = formatIcsDate(calendar.now ?? new Date());
  const name = escapeIcsText(calendar.name);
  const hours = calendar.refreshIntervalHours;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `NAME:${name}`,
    `X-WR-CALNAME:${name}`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${hours}H`,
    `X-PUBLISHED-TTL:PT${hours}H`,
    ...calendar.events.flatMap((event) => eventLines(event, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
