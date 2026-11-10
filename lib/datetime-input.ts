/**
 * Conversions between ISO timestamps and `<input type="datetime-local">`
 * values, which have no time zone and are in the browser's local time.
 * Call these in the browser so "7pm" means 7pm where the user is.
 */

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in local time. */
export function toDateTimeInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local "YYYY-MM-DDTHH:mm" → ISO timestamp; blank → null. */
export function fromDateTimeInput(
  value: string | null | undefined
): string | null {
  return value ? new Date(value).toISOString() : null;
}
