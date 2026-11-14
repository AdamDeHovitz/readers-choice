import { bookMetaLine } from "@readers-choice/core/book-meta";

interface BookMetaProps {
  pageCount: number | null;
  publishedYear: number | null;
  className?: string;
}

/** Compact "320 pages · Published 1999" line; renders nothing when both are missing. */
export function BookMeta({ className, ...book }: BookMetaProps) {
  const line = bookMetaLine(book);
  return line ? <p className={className}>{line}</p> : null;
}
