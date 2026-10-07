/**
 * Calendar-year helpers pinned to UTC so results don't depend on the server's
 * local timezone.
 */

/** [start, end) ISO timestamps covering `year` in UTC */
export function getUtcYearRange(year: number): { start: string; end: string } {
  return {
    start: new Date(Date.UTC(year, 0, 1)).toISOString(),
    end: new Date(Date.UTC(year + 1, 0, 1)).toISOString(),
  };
}

/** The UTC calendar year of a timestamp */
export function getUtcYear(timestamp: string): number {
  return new Date(timestamp).getUTCFullYear();
}
