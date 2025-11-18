/**
 * Sanitizes and decodes book descriptions for safe HTML rendering
 * Handles:
 * 1. HTML entity decoding (fixes â¿¿ character encoding issues)
 * 2. HTML sanitization (allows safe tags, removes unsafe ones)
 */

const ALLOWED_TAGS = ["p", "br", "i", "b", "em", "strong"];
const ALLOWED_ATTRIBUTES: string[] = [];

/**
 * Decodes HTML entities like &quot; &apos; &#x2019; etc.
 * This fixes HTML entity encoding
 *
 * Note: Uses consistent logic on both server and client to avoid hydration errors
 * Note: Character encoding (mojibake) is now fixed at the source in normalize-text.ts
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, "…");
}

/**
 * Sanitizes HTML by removing all tags except allowed ones
 * This prevents XSS while preserving basic formatting
 */
function sanitizeHtml(html: string): string {
  // Remove all tags except allowed ones
  let sanitized = html;

  // First, decode HTML entities
  sanitized = decodeHtmlEntities(sanitized);

  // Remove script and style tags entirely (including content)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove event handlers and javascript: links
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, "");

  // Remove all tags except allowed ones
  sanitized = sanitized.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    const tagName = tag.toLowerCase();

    // If it's an allowed tag
    if (ALLOWED_TAGS.includes(tagName)) {
      // For self-closing tags like <br>
      if (tagName === "br") {
        return "<br>";
      }

      // For other tags, check if it's closing or opening
      if (match.startsWith("</")) {
        return `</${tagName}>`;
      }

      // Opening tag - remove all attributes for now (can be enhanced later)
      return `<${tagName}>`;
    }

    // Remove disallowed tags
    return "";
  });

  return sanitized.trim();
}

/**
 * Main export: sanitizes and decodes a book description for safe rendering
 * Can be used with dangerouslySetInnerHTML
 */
export function sanitizeDescription(description: string | null | undefined): string {
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
