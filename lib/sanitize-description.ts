/**
 * Sanitizes and decodes book descriptions for safe HTML rendering
 * Handles:
 * 1. HTML entity decoding (fixes â¿¿ character encoding issues)
 * 2. HTML sanitization (allows safe tags, removes unsafe ones)
 */

const ALLOWED_TAGS = ["p", "br", "i", "b", "em", "strong"];

/**
 * Decodes HTML entities like &quot; &apos; &#x2019; etc.
 * This fixes HTML entity encoding
 *
 * Note: Uses consistent logic on both server and client to avoid hydration errors
 * Note: Character encoding (mojibake) is now fixed at the source in normalize-text.ts
 * Note: &amp; is decoded last so "&amp;lt;" becomes the text "&lt;", not "<"
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#x201C;/g, '"')
    .replace(/&#x201D;/g, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Matches an escaped allowed tag, e.g. "&lt;p class=&quot;x&quot;&gt;" or "&lt;br/&gt;".
// Attributes are matched only so they can be dropped.
const ESCAPED_ALLOWED_TAG = new RegExp(
  `&lt;(/?)(${ALLOWED_TAGS.join("|")})(?:\\s(?:(?!&gt;)[\\s\\S])*?)?/?&gt;`,
  "gi"
);

/**
 * Sanitizes HTML by escaping everything, then restoring only bare allowed tags.
 * Safe by construction: the only "<" in the output come from the replacement
 * below, which emits attribute-free allowlisted tags. Disallowed markup is
 * rendered as visible text rather than parsed.
 */
function sanitizeHtml(html: string): string {
  // Drop script/style blocks so their contents don't show up as text
  const withoutBlocks = decodeHtmlEntities(html)
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "");

  return escapeHtml(withoutBlocks)
    .replace(ESCAPED_ALLOWED_TAG, (_match, slash: string, tag: string) => {
      const tagName = tag.toLowerCase();
      if (tagName === "br") return "<br>";
      return `<${slash}${tagName}>`;
    })
    .trim();
}

/**
 * Main export: sanitizes and decodes a book description for safe rendering
 * Can be used with dangerouslySetInnerHTML
 */
export function sanitizeDescription(
  description: string | null | undefined
): string {
  if (!description) return "";
  return sanitizeHtml(description);
}

/**
 * Strips all HTML tags from description, returning plain text
 * Useful for previews or plain text rendering
 */
export function stripHtmlTags(description: string | null | undefined): string {
  if (!description) return "";

  // First decode entities
  let text = decodeHtmlEntities(description);

  // Replace <br> tags with spaces
  text = text.replace(/<br\s*\/?>/gi, " ");

  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Clean up multiple spaces
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
