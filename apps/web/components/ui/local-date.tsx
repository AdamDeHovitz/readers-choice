"use client";

import { useSyncExternalStore } from "react";
import { formatDate, type DateFormat } from "@readers-choice/core/date-format";

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
  const text = useSyncExternalStore(
    subscribe,
    () => formatDate(iso, format),
    () => formatDate(iso, format, "UTC")
  );
  return <time dateTime={iso}>{text}</time>;
}
