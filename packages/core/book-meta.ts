/**
 * A book's compact details line, "320 pages · Published 1999", or null
 * when both are missing. Both apps show it under a book's title.
 */
export function bookMetaLine({
  pageCount,
  publishedYear,
}: {
  pageCount: number | null;
  publishedYear: number | null;
}): string | null {
  const parts = [
    pageCount ? `${pageCount} pages` : null,
    publishedYear ? `Published ${publishedYear}` : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}
