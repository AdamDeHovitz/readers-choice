import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, UsersIcon } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
}

interface Meeting {
  id: string;
  meetingDate: string;
  isFinalized: boolean;
}

interface BookDisplayProps {
  state: "nominating" | "voting" | "inactive";
  book: Book | null;
  meeting?: Meeting;
  label: "Current Book" | "Previous Book" | "Upcoming";
}

export function BookDisplay({
  state,
  book,
  meeting,
  label,
}: BookDisplayProps) {
  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-cream-100 border-gold-600/20">
          <CardContent className="p-8 text-center">
            <p className="text-dark-600 font-inria">
              No book to display yet. {label === "Upcoming" && "Waiting for the next meeting to be scheduled."}
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <h2 className="text-2xl font-voga text-dark-900 text-center">
          {label}
        </h2>
      </div>

      <Card className="bg-white border-gold-600/20 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Book Cover */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  width={160}
                  height={240}
                  className="w-40 h-60 object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-40 h-60 bg-cream-200 rounded-lg shadow-md flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-dark-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Book Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-2xl font-playfair font-semibold text-dark-900 mb-2">
                {book.title}
              </h3>
              <p className="text-lg text-dark-600 font-inria mb-4">
                by {book.author}
              </p>

              {/* Meeting Info */}
              {meeting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-dark-600">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm font-inria">
                      {label === "Previous Book" && "Read on "}
                      {label === "Upcoming" && "Meeting on "}
                      {formatDate(meeting.meetingDate)}
                    </span>
                  </div>

                  {meeting.id && (
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="inline-flex items-center gap-2 text-rust-700 hover:text-rust-900 text-sm font-inria font-medium"
                    >
                      <UsersIcon className="h-4 w-4" />
                      View meeting details →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
