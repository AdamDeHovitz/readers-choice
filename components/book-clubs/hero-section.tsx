import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarIcon, BookOpenIcon, SparklesIcon } from "lucide-react";

interface HeroSectionProps {
  bookClubId: string;
  bookClubName: string;
  state: "nominating" | "voting" | "inactive";
  meetingId?: string;
  meetingDate?: string;
  themeName?: string;
  nominationDeadline?: string;
  votingDeadline?: string;
}

export function HeroSection({
  bookClubId,
  bookClubName,
  state,
  meetingId,
  meetingDate,
  themeName,
  nominationDeadline,
  votingDeadline,
}: HeroSectionProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-gold-600 text-dark-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        {/* Book Club Name */}
        <h1 className="font-voga text-4xl sm:text-5xl lg:text-6xl uppercase tracking-wide">
          {bookClubName}
        </h1>

        {/* Meeting Info */}
        {(state === "nominating" || state === "voting") && (
          <div className="space-y-2">
            {themeName && (
              <div className="flex items-center justify-center gap-2 text-lg font-inria">
                <SparklesIcon className="h-5 w-5" />
                <span className="font-semibold">Theme: {themeName}</span>
              </div>
            )}
            {meetingDate && (
              <div className="flex items-center justify-center gap-2 text-base font-inria">
                <CalendarIcon className="h-4 w-4" />
                <span>{formatDate(meetingDate)}</span>
              </div>
            )}
            {nominationDeadline && state === "nominating" && (
              <p className="text-sm text-dark-900/80 font-inria">
                Nominations close {formatDate(nominationDeadline)}
              </p>
            )}
            {votingDeadline && state === "voting" && (
              <p className="text-sm text-dark-900/80 font-inria">
                Voting closes {formatDate(votingDeadline)}
              </p>
            )}
          </div>
        )}

        {/* Primary Action Button */}
        <div className="pt-4">
          {state === "nominating" && meetingId && (
            <Link href={`/meetings/${meetingId}`}>
              <Button
                size="lg"
                className="bg-dark-900 text-cream-100 hover:bg-dark-600 font-inria text-lg px-8 py-6 shadow-lg"
              >
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Nominate a Book
              </Button>
            </Link>
          )}

          {state === "voting" && meetingId && (
            <Link href={`/meetings/${meetingId}`}>
              <Button
                size="lg"
                className="bg-dark-900 text-cream-100 hover:bg-dark-600 font-inria text-lg px-8 py-6 shadow-lg"
              >
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Vote for a Book
              </Button>
            </Link>
          )}

          {state === "inactive" && (
            <Link href={`/book-clubs/${bookClubId}/themes`}>
              <Button
                size="lg"
                className="bg-dark-900 text-cream-100 hover:bg-dark-600 font-inria text-lg px-8 py-6 shadow-lg"
              >
                <SparklesIcon className="h-5 w-5 mr-2" />
                Suggest Themes
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
