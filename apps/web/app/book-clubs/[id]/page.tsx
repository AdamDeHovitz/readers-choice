import Link from "next/link";
import { redirect } from "next/navigation";
import { LockIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import {
  pickFeaturedMeeting,
  pickUpcomingMeeting,
} from "@readers-choice/core/meeting-schedule";
import { getBookClubDetails, type BookClubDetails } from "@/server/clubs";
import { getViewerJoinRequest } from "@/server/join-requests";
import { getBookClubMeetings } from "@/server/meetings";
import { getViewer, type Viewer } from "@/server/viewer";
import { BookDisplay } from "@/components/book-clubs/book-display";
import { JoinClubPanel } from "@/components/book-clubs/join-club-panel";
import { UpNextCard } from "@/components/book-clubs/up-next-card";
import { Badge } from "@/components/ui/badge";
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

  if (!viewer || !bookClub.currentUserIsMember) {
    const count = bookClub.members.length;
    return (
      <>
        <PageHeader
          title={bookClub.name}
          description={bookClub.description}
          eyebrow={
            <Badge variant="outline">
              <UsersIcon aria-hidden />
              {count} {count === 1 ? "member" : "members"}
            </Badge>
          }
        />
        <VisitorPanel viewer={viewer} bookClub={bookClub} />
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

/** How a visitor (signed out, or not a member) can get into the club. */
async function VisitorPanel({
  viewer,
  bookClub,
}: {
  viewer: Viewer | null;
  bookClub: BookClubDetails;
}) {
  const { joinPolicy } = bookClub;

  if (joinPolicy === "invite_only") {
    return (
      <EmptyState
        icon={<LockIcon />}
        title="Invite required"
        description={`${bookClub.name} is invite-only. Ask a member for an invite link to join and see meetings, vote on books, and take part.`}
        action={!viewer && <SignInButton bookClubId={bookClub.id} />}
      />
    );
  }

  if (!viewer) {
    return (
      <EmptyState
        icon={<UserPlusIcon />}
        title={
          joinPolicy === "open"
            ? `Join ${bookClub.name}`
            : `Ask to join ${bookClub.name}`
        }
        description="Sign in to nominate books, vote on what the club reads next, and rank your favorites."
        action={<SignInButton bookClubId={bookClub.id} />}
      />
    );
  }

  return (
    <JoinClubPanel
      bookClubId={bookClub.id}
      bookClubName={bookClub.name}
      joinPolicy={joinPolicy}
      request={await getViewerJoinRequest(
        viewer.db,
        bookClub.id,
        viewer.userId
      )}
    />
  );
}

function SignInButton({ bookClubId }: { bookClubId: string }) {
  return (
    <Button asChild>
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(`/book-clubs/${bookClubId}`)}`}
      >
        Sign in
      </Link>
    </Button>
  );
}
