import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JOIN_REQUEST_COOLDOWN_DAYS } from "@readers-choice/core/join-policy";
import { getBookClubDetails } from "@/server/clubs";
import { getPendingJoinRequests } from "@/server/join-requests";
import { getViewer } from "@/server/viewer";
import { MemberList } from "@/components/book-clubs/member-list";
import { InviteLinkDialog } from "@/components/book-clubs/invite-link-dialog";
import { JoinPolicySetting } from "@/components/book-clubs/join-policy-setting";
import { JoinRequestList } from "@/components/book-clubs/join-request-list";
import { PageHeader, Section } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [viewer, { id: bookClubId }] = await Promise.all([getViewer(), params]);
  if (!viewer) {
    redirect("/login");
  }

  const bookClub = await getBookClubDetails(viewer, bookClubId);

  if (!bookClub) {
    redirect("/dashboard");
  }

  const isAdmin = bookClub.currentUserIsAdmin;
  const requests = isAdmin
    ? await getPendingJoinRequests(viewer.db, bookClubId)
    : [];
  const count = bookClub.members.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Members"
        description={`${count} ${count === 1 ? "member" : "members"}`}
        actions={
          isAdmin && (
            <InviteLinkDialog
              bookClubId={bookClubId}
              bookClubName={bookClub.name}
            />
          )
        }
      />
      {requests.length > 0 && (
        <Section
          title="Requests to join"
          description={`Declined requesters aren't notified, and can ask again after ${JOIN_REQUEST_COOLDOWN_DAYS} days.`}
        >
          <JoinRequestList bookClubId={bookClubId} requests={requests} />
        </Section>
      )}
      <MemberList
        members={bookClub.members}
        currentUserId={viewer.userId}
        currentUserIsAdmin={isAdmin}
        bookClubId={bookClubId}
      />
      {isAdmin && (
        <Section title="Who can join">
          <JoinPolicySetting
            bookClubId={bookClubId}
            joinPolicy={bookClub.joinPolicy}
            pendingRequestCount={requests.length}
          />
        </Section>
      )}
    </div>
  );
}
