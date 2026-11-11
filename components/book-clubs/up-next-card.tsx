import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  SparklesIcon,
} from "lucide-react";
import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { Button } from "@/components/ui/button";
import { LocalDate } from "@/components/ui/local-date";
import { getMeetingPhase } from "@/lib/meeting-schedule";
import type { MeetingSummary } from "@/server/meetings";

// The club home's one bold block: rust, so it stands apart from the sage
// top bar, with a cream button as its single action.
const CARD = "bg-rust-600 text-cream-50 rounded-3xl p-5 shadow-md sm:p-6";
const BUTTON =
  "bg-cream-50 text-rust-700 hover:bg-cream-100 mt-5 w-full sm:w-auto";

/**
 * The club home's call to action: what the next meeting needs from the
 * reader right now (nominate, vote, wait for results), or suggesting themes
 * when nothing is scheduled.
 */
export function UpNextCard({
  bookClubId,
  meeting,
}: {
  bookClubId: string;
  meeting: MeetingSummary | null;
}) {
  if (!meeting) {
    return (
      <section className={CARD}>
        <p className="text-rust-100 text-xs font-bold tracking-wide uppercase">
          Up next
        </p>
        <h2 className="font-display mt-1 text-2xl">No meeting scheduled</h2>
        <p className="text-rust-100 mt-1 text-sm">
          Help pick what comes next by suggesting a theme.
        </p>
        <Button asChild className={BUTTON}>
          <Link href={`/book-clubs/${bookClubId}/themes`}>
            <SparklesIcon aria-hidden />
            Suggest a theme
          </Link>
        </Button>
      </section>
    );
  }

  const phase = getMeetingPhase(meeting);
  const cta =
    phase === "nominating"
      ? "Nominate a book"
      : phase === "voting"
        ? "Vote for a book"
        : "See the results";
  const deadline =
    phase === "nominating" && meeting.nominationDeadline ? (
      <>
        Nominations close{" "}
        <LocalDate iso={meeting.nominationDeadline} format="deadline" />
      </>
    ) : phase === "voting" && meeting.votingDeadline ? (
      <>
        Voting closes{" "}
        <LocalDate iso={meeting.votingDeadline} format="deadline" />
      </>
    ) : phase === "awaiting_finalization" ? (
      "Waiting for an admin to pick the book"
    ) : null;

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-rust-100 text-xs font-bold tracking-wide uppercase">
          Up next
        </p>
        <MeetingStatusBadge
          meeting={meeting}
          className="bg-cream-50 text-rust-700"
        />
      </div>
      <h2 className="font-display mt-1 text-2xl text-balance sm:text-3xl">
        {meeting.theme?.name ?? "Next meeting"}
      </h2>
      <ul className="text-rust-100 mt-3 space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <CalendarDaysIcon className="size-4 shrink-0" aria-hidden />
          <LocalDate iso={meeting.meetingDate} format="meeting" />
        </li>
        {deadline && (
          <li className="flex items-center gap-2">
            <ClockIcon className="size-4 shrink-0" aria-hidden />
            {deadline}
          </li>
        )}
      </ul>
      <Button asChild size="lg" className={BUTTON}>
        <Link href={`/meetings/${meeting.id}`}>
          {cta}
          <ArrowRightIcon aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
