/**
 * Text normalization utilities for API responses
 * Fixes encoding issues and standardizes text from external sources
 */

/**
 * Windows-1252 code points for bytes 0x80-0x9F. Bytes 0x81, 0x8D, 0x8F, 0x90
 * and 0x9D are undefined in Windows-1252 and decode to the matching C1
 * control character, exactly as Latin-1 would.
 */
const CP1252_HIGH =
  "\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021" +
  "\u02c6\u2030\u0160\u2039\u0152\u008d\u017d\u008f" +
  "\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014" +
  "\u02dc\u2122\u0161\u203a\u0153\u009d\u017e\u0178";

/**
 * Re-create the garbled form of `text` produced when its UTF-8 bytes are
 * decoded as Windows-1252 (or, with `latin1`, as ISO-8859-1).
 */
function toMojibake(text: string, encoding: "cp1252" | "latin1"): string {
  return Array.from(new TextEncoder().encode(text), (byte) =>
    encoding === "cp1252" && byte >= 0x80 && byte <= 0x9f
      ? CP1252_HIGH.charAt(byte - 0x80)
      : String.fromCharCode(byte)
  ).join("");
}

/** Characters we repair, mapped to the text they should become. */
const REPAIR_TARGETS: ReadonlyArray<[original: string, replacement: string]> = [
  ["\u2019", "'"], // Right single quote
  ["\u2018", "'"], // Left single quote
  ["\u201c", '"'], // Left double quote
  ["\u201d", '"'], // Right double quote
  ["\u2014", "\u2014"], // Em dash
  ["\u2013", "\u2013"], // En dash
  ["\u2026", "\u2026"], // Horizontal ellipsis
  // Accented Latin-1 letters (U+00C0-U+00FF, excluding × and ÷)
  ...Array.from({ length: 0x40 }, (_, i) => String.fromCharCode(0xc0 + i))
    .filter((ch) => ch !== "\u00d7" && ch !== "\u00f7")
    .map((ch): [string, string] => [ch, ch]),
];

/**
 * Every known garbled sequence and its repair, longest first so that
 * double-encoded and multi-byte sequences are replaced before any shorter
 * sequence that is a prefix of them.
 */
const MOJIBAKE_REPLACEMENTS: ReadonlyArray<[string, string]> = (() => {
  const pairs = new Map<string, string>();
  for (const [original, replacement] of REPAIR_TARGETS) {
    for (const encoding of ["cp1252", "latin1"] as const) {
      const once = toMojibake(original, encoding);
      pairs.set(toMojibake(once, encoding), replacement); // double-encoded
      pairs.set(once, replacement);
    }
  }
  // Legacy form of "à" where the trailing non-breaking space became a space
  pairs.set("\u00c3 ", "\u00e0");
  return [...pairs.entries()].sort(([a], [b]) => b.length - a.length);
})();

/**
 * Normalizes text from external APIs (Google Books, Open Library)
 * Fixes common encoding issues like mojibake where UTF-8 smart quotes,
 * dashes and accented letters were incorrectly decoded as Windows-1252/Latin-1
 */
export function normalizeApiText(
  text: string | null | undefined
): string | null {
  if (!text) return null;

  let normalized = text;

  for (const [garbled, replacement] of MOJIBAKE_REPLACEMENTS) {
    normalized = normalized.split(garbled).join(replacement);
  }

  // Fallbacks once every specific sequence has been handled
  normalized = normalized
    .replace(/\u00e2\u20ac/g, '"') // Right double quote whose final byte was dropped
    .replace(/\u00e2\?{2}/g, "'") // Undecodable character shown as "â??"
    .replace(/\u00e2\u00bf\u00bf/g, "'") // Replacement character shown differently
    .replace(/\ufffd/g, "'"); // Unicode replacement character

  // Trim whitespace
  normalized = normalized.trim();

  // Clean up multiple consecutive spaces
  normalized = normalized.replace(/\s+/g, " ");

  return normalized;
}

/**
 * Normalizes HTML content from APIs
 * Preserves HTML tags while fixing encoding issues
 */
export function normalizeApiHtml(
  html: string | null | undefined
): string | null {
  if (!html) return null;

  // First normalize the text content
  let normalized = normalizeApiText(html);
  if (!normalized) return null;

  // Additional HTML-specific normalization
  // Fix common HTML entity issues
  normalized = normalized
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…");

  return normalized;
}
