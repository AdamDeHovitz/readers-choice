import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getViewer } from "@/server/viewer";
import { MemberList } from "@/components/book-clubs/member-list";
import { InviteLinkDialog } from "@/components/book-clubs/invite-link-dialog";
import { PageHeader } from "@/components/ui/page-header";

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

  const count = bookClub.members.length;
  return (
    <>
      <PageHeader
        title="Members"
        description={`${count} ${count === 1 ? "member" : "members"}`}
        actions={
          bookClub.currentUserIsAdmin && (
            <InviteLinkDialog
              bookClubId={bookClubId}
              bookClubName={bookClub.name}
            />
          )
        }
      />
      <MemberList
        members={bookClub.members}
        currentUserId={viewer.userId}
        currentUserIsAdmin={bookClub.currentUserIsAdmin}
        bookClubId={bookClubId}
      />
    </>
  );
}
