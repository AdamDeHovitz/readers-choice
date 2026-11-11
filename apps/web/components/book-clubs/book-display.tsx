import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { BookMeta } from "@/components/books/book-meta";
import { Section } from "@/components/ui/page-header";
import { LocalDate } from "@/components/ui/local-date";
import { sanitizeDescription } from "@readers-choice/core/sanitize-description";
import type { MeetingSummary } from "@/server/meetings";

interface BookDisplayProps {
  /** The featured meeting; its selected book is shown. */
  meeting: MeetingSummary;
  label: "Upcoming" | "Previous Book";
}

/** The club's featured book: the next one to read, or the last one read. */
export function BookDisplay({ meeting, label }: BookDisplayProps) {
  const book = meeting.selectedBook;
  if (!book) return null;

  return (
    <Section
      title={label === "Upcoming" ? "Reading now" : "Last read"}
      description={
        <>
          <LocalDate iso={meeting.meetingDate} format="date" />
          {meeting.theme && ` · ${meeting.theme.name}`}
        </>
      }
    >
      <article className="bg-card border-border overflow-hidden rounded-2xl border shadow-xs">
        <div className="flex gap-4 p-4 sm:gap-6 sm:p-6">
          <div className="shrink-0">
            <BookCover coverUrl={book.coverUrl} title={book.title} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-foreground text-xl leading-tight sm:text-2xl">
              {book.title}
            </h3>
            <p className="text-muted-foreground mt-1">by {book.author}</p>
            <BookMeta
              pageCount={book.pageCount}
              publishedYear={book.publishedYear}
              className="text-dark-500 mt-2 text-sm"
            />
          </div>
        </div>

        {book.description && (
          <div
            className="bg-rust-600 text-cream-50 mx-4 mb-4 rounded-xl p-4 text-sm leading-relaxed sm:mx-6 sm:mb-6 sm:p-5"
            dangerouslySetInnerHTML={{
              __html: sanitizeDescription(book.description),
            }}
          />
        )}

        {meeting.details && (
          <blockquote className="bg-muted/60 mx-4 mb-4 rounded-xl p-3 text-sm sm:mx-6 sm:mb-6">
            <p className="text-foreground mb-1 font-bold">From the host</p>
            <p className="text-dark-700 whitespace-pre-wrap">
              {meeting.details}
            </p>
          </blockquote>
        )}

        <Link
          href={`/meetings/${meeting.id}`}
          className="border-border text-primary hover:bg-muted/50 flex items-center justify-between border-t px-4 py-3.5 text-sm font-bold sm:px-6"
        >
          View meeting
          <ChevronRightIcon className="size-4" aria-hidden />
        </Link>
      </article>
    </Section>
  );
}
