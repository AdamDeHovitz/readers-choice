import Link from "next/link";
import { redirect } from "next/navigation";
import { LockIcon } from "lucide-react";
import {
  pickFeaturedMeeting,
  pickUpcomingMeeting,
} from "@readers-choice/core/meeting-schedule";
import { getBookClubDetails } from "@/server/clubs";
import { getBookClubMeetings } from "@/server/meetings";
import { getViewer } from "@/server/viewer";
import { BookDisplay } from "@/components/book-clubs/book-display";
import { UpNextCard } from "@/components/book-clubs/up-next-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function BookClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [viewer, { id }] = await Promise.all([getViewer(), params]);

  const [bookClub, meetings] = await Promise.all([
    getBookClubDetails(viewer, id),
    viewer ? getBookClubMeetings(viewer, id) : [],
  ]);

  if (!bookClub) {
    redirect("/browse");
  }

  // If not logged in or not a member, show a limited view. Joining requires an
  // invite link from a club admin.
  if (!viewer || !bookClub.currentUserIsMember) {
    return (
      <>
        <PageHeader title={bookClub.name} description={bookClub.description} />
        <EmptyState
          icon={<LockIcon />}
          title="Invite required"
          description={`${bookClub.name} is invite-only. Ask a club admin for an invite link to join and see meetings, vote on books, and take part.`}
          action={
            !viewer && (
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )
          }
        />
      </>
    );
  }

  const now = new Date();
  const upcomingMeeting = pickUpcomingMeeting(meetings, now);
  const featured = pickFeaturedMeeting(
    meetings.filter((m) => m.selectedBook),
    now
  );

  return (
    <div className="space-y-8">
      <h1 className="sr-only">{bookClub.name}</h1>
      <UpNextCard bookClubId={id} meeting={upcomingMeeting} />
      {featured && (
        <BookDisplay meeting={featured.meeting} label={featured.label} />
      )}
    </div>
  );
}
