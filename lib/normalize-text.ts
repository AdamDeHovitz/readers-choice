/**
 * Text normalization utilities for API responses
 * Fixes encoding issues and standardizes text from external sources
 */

/**
 * Normalizes text from external APIs (Google Books, Open Library)
 * Fixes common encoding issues like mojibake where UTF-8 smart quotes
 * were incorrectly decoded as Latin-1
 */
export function normalizeApiText(text: string | null | undefined): string | null {
  if (!text) return null;

  let normalized = text;

  // Fix mojibake: UTF-8 characters incorrectly interpreted as Latin-1
  // These patterns occur when UTF-8 smart quotes/dashes are decoded as Windows-1252/Latin-1
  normalized = normalized
    // Smart quotes and apostrophes
    .replace(/â€™/g, "'")  // Right single quote (U+2019)
    .replace(/â€˜/g, "'")  // Left single quote (U+2018)
    .replace(/â€œ/g, '"')  // Left double quote (U+201C)
    .replace(/â€/g, '"')   // Right double quote (U+201D)
    .replace(/Ã¢â‚¬â„¢/g, "'")  // Alternative encoding of right single quote
    .replace(/Ã¢â‚¬Å"/g, '"')   // Alternative encoding of left double quote
    .replace(/Ã¢â‚¬\u009d/g, '"') // Alternative encoding of right double quote

    // Dashes
    .replace(/â€"/g, "—")  // Em dash (U+2014)
    .replace(/â€"/g, "–")  // En dash (U+2013)

    // Common accented characters
    .replace(/Ã©/g, "é")   // é (e-acute)
    .replace(/Ã¨/g, "è")   // è (e-grave)
    .replace(/Ã /g, "à")   // à (a-grave)
    .replace(/Ã¡/g, "á")   // á (a-acute)
    .replace(/Ã­/g, "í")   // í (i-acute)
    .replace(/Ã³/g, "ó")   // ó (o-acute)
    .replace(/Ãº/g, "ú")   // ú (u-acute)
    .replace(/Ã±/g, "ñ")   // ñ (n-tilde)
    .replace(/Ã§/g, "ç")   // ç (c-cedilla)

    // Ellipsis
    .replace(/â€¦/g, "…")  // Horizontal ellipsis (U+2026)

    // Generic replacement character patterns (when actual character couldn't be decoded)
    .replace(/â\?{2}/g, "'")  // Generic � character shown as â??
    .replace(/â¿¿/g, "'")     // Replacement character shown differently
    .replace(/�/g, "'");      // Unicode replacement character

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
export function normalizeApiHtml(html: string | null | undefined): string | null {
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
