import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { UsersIcon } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { sanitizeDescription } from "@/lib/sanitize-description";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description?: string | null;
  pageCount?: number | null;
  publishedYear?: number | null;
}

interface Meeting {
  id: string;
  meetingDate: string;
  isFinalized: boolean;
  themeName?: string | null;
  details?: string | null;
}

interface BookDisplayProps {
  book: Book | null;
  meeting?: Meeting;
  label: "Current Book" | "Previous Book" | "Upcoming";
}

export function BookDisplay({ book, meeting, label }: BookDisplayProps) {
  if (!book) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="bg-cream-100 border-gold-600/20">
          <CardContent className="p-8 text-center">
            <p className="text-dark-600 font-inria">
              No book to display yet.{" "}
              {label === "Upcoming" &&
                "Waiting for the next meeting to be scheduled."}
              {label === "Previous Book" && "No previous meetings yet."}
              {label === "Current Book" && "No current book selected."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="font-voga text-dark-900 text-center text-4xl tracking-wider uppercase">
          {label}
        </h2>
        {meeting?.themeName && (
          <p className="text-dark-700 font-inria mt-2 text-center text-xl">
            {formatDate(meeting.meetingDate)} - {meeting.themeName}
          </p>
        )}
      </div>

      <Card className="border-gold-600/20 bg-white shadow-lg">
        <CardContent className="p-4 sm:p-6">
          {/* Centered Book Cover and Info */}
          <div className="mx-auto flex max-w-2xl flex-col items-center">
            {/* Book Cover and Details Side by Side */}
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
              {/* Book Cover */}
              <div className="mx-auto flex-shrink-0 sm:mx-0">
                <BookCover
                  coverUrl={book.coverUrl}
                  title={book.title}
                  size="lg"
                />
              </div>

              {/* Book Details */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div>
                  <h3 className="font-inria text-dark-900 text-2xl font-semibold sm:text-3xl">
                    {book.title}
                  </h3>
                  <p className="text-dark-700 font-inria mt-1 text-base sm:text-lg">
                    By {book.author}
                  </p>
                </div>

                {/* Page Count and Published Year */}
                {(book.pageCount || book.publishedYear) && (
                  <div className="text-dark-600 font-inria flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm sm:justify-start sm:text-base">
                    {book.pageCount && <span>{book.pageCount} pages</span>}
                    {book.publishedYear && (
                      <span>Published in {book.publishedYear}</span>
                    )}
                  </div>
                )}

                {/* Meeting Link */}
                {meeting?.id && (
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="text-rust-700 hover:text-rust-800 font-inria inline-flex items-center gap-2 font-medium"
                  >
                    <UsersIcon className="h-4 w-4" />
                    View meeting →
                  </Link>
                )}
              </div>
            </div>

            {/* Book Description - Full Width Below */}
            {book.description && (
              <div className="bg-rust-600 mt-4 w-full rounded-lg p-4 sm:p-5">
                <p
                  className="text-cream-100 font-inria text-sm leading-relaxed sm:text-base"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeDescription(book.description),
                  }}
                />
              </div>
            )}

            {/* Host's Message - Full Width Below */}
            {meeting?.details && (
              <div className="bg-cream-100 border-gold-600/20 mt-3 w-full rounded-lg border p-3 sm:p-4">
                <p className="font-inria text-dark-900 mb-1 text-sm font-medium">
                  Host&apos;s Message:
                </p>
                <p className="text-dark-700 font-inria text-sm whitespace-pre-wrap">
                  {meeting.details}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
