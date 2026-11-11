/**
 * Conversions between ISO timestamps and local "YYYY-MM-DDTHH:mm" form
 * values (the `<input type="datetime-local">` format), which have no time
 * zone and are in the browser's local time. Call these in the browser so
 * "7pm" means 7pm where the user is.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Local date → "YYYY-MM-DD". */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → local midnight on that day. */
export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in local time. */
export function toDateTimeInput(iso: string): string {
  const date = new Date(iso);
  return `${toDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local "YYYY-MM-DDTHH:mm" → ISO timestamp; blank → null. */
export function fromDateTimeInput(
  value: string | null | undefined
): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** "YYYY-MM-DDTHH:mm" → its date and time parts; blank → both blank. */
export function splitDateTimeInput(value: string): {
  date: string;
  time: string;
} {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

/** Date and time parts → "YYYY-MM-DDTHH:mm"; blank if there's no date. */
export function joinDateTimeInput(date: string, time: string): string {
  return date ? `${date}T${time}` : "";
}

/** Last minute of the day, offered so deadlines can mean "end of day". */
export const END_OF_DAY = "23:59";

/** "HH:mm" choices for a time picker: every 15 minutes, plus end of day. */
export const TIME_SLOTS: readonly string[] = [
  ...Array.from(
    { length: 96 },
    (_, i) => `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`
  ),
  END_OF_DAY,
];

/** "HH:mm" → a label in the user's locale, e.g. "7:00 PM" or "19:00". */
export function formatTimeOfDay(time: string, locale?: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}
