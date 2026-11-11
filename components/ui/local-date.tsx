"use client";

import { useSyncExternalStore } from "react";

/** Named formats, so dates read the same across pages. */
const FORMATS = {
  /** "Wednesday, December 2, 7:00 PM" */
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

export type DateFormat = keyof typeof FORMATS;

const subscribe = () => () => {};

/**
 * A timestamp formatted in the viewer's time zone. Servers run in UTC, so a
 * 7pm meeting in New York would otherwise render as the next day. The server
 * HTML uses UTC, and the browser swaps in local time as it hydrates.
 */
export function LocalDate({
  iso,
  format,
}: {
  iso: string;
  format: DateFormat;
}) {
  const options = FORMATS[format];
  const text = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleString("en-US", options),
    () => new Date(iso).toLocaleString("en-US", { ...options, timeZone: "UTC" })
  );
  return <time dateTime={iso}>{text}</time>;
}
