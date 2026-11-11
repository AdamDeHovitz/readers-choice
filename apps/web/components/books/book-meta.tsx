interface BookMetaProps {
  pageCount: number | null;
  publishedYear: number | null;
  className?: string;
}

/** Compact "320 pages · Published 1999" line; renders nothing when both are missing. */
export function BookMeta({
  pageCount,
  publishedYear,
  className,
}: BookMetaProps) {
  if (!pageCount && !publishedYear) return null;

  return (
    <p className={className}>
      {pageCount ? `${pageCount} pages` : null}
      {pageCount && publishedYear ? " · " : null}
      {publishedYear ? `Published ${publishedYear}` : null}
    </p>
  );
}
