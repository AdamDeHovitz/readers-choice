import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract a four-digit year from a loosely formatted date string.
 * Handles "2011", "2011-05-03", "May 2, 2011", "c1999". Returns undefined
 * when no full year is present (e.g. "199?"), never NaN.
 */
export function parseYear(
  value: string | null | undefined
): number | undefined {
  const match = value?.match(/(?<!\d)(\d{4})(?!\d)/);
  return match ? Number(match[1]) : undefined;
}
