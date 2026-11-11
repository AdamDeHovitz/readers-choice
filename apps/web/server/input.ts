import "server-only";
import { UserError } from "@readers-choice/core/user-error";

/**
 * Guards for server action arguments. TypeScript types don't survive the
 * network: every action argument is untrusted client input.
 */

/** A trimmed non-empty string, or a UserError with `message`. */
export function requiredText(value: unknown, message: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new UserError(message);
  return text;
}

/** A trimmed string, or null when missing or blank. */
export function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** A parseable date string, or a UserError with `message`. */
export function requiredDate(value: unknown, message: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new UserError(message);
  }
  return value;
}

/** A parseable date string, or null when missing or blank. */
export function optionalDate(value: unknown, message: string): string | null {
  return optionalText(value) === null ? null : requiredDate(value, message);
}
