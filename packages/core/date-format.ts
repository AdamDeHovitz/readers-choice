/**
 * Named date formats, so a date reads the same on every page of both apps.
 * Each client formats in the viewer's time zone (see LocalDate on the web).
 */
export const DATE_FORMATS = {
  /** "Wednesday, December 2 at 7:00 PM" */
  meeting: {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
  /** "Wed, Dec 2, 11:59 PM" */
  deadline: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
  /** "December 2, 2026" */
  date: { month: "long", day: "numeric", year: "numeric" },
  /** "December 2026" */
  monthYear: { month: "long", year: "numeric" },
  /** "Dec 2026" */
  shortMonthYear: { month: "short", year: "numeric" },
  /** "Dec" */
  shortMonth: { month: "short" },
  /** "2" */
  day: { day: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateFormat = keyof typeof DATE_FORMATS;

/**
 * Format a timestamp in a named format. `timeZone` defaults to the
 * runtime's own, which is the viewer's on a phone or in a browser.
 */
export function formatDate(
  iso: string,
  format: DateFormat,
  timeZone?: string
): string {
  return new Date(iso).toLocaleString("en-US", {
    ...DATE_FORMATS[format],
    timeZone,
  });
}
