import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/server/clubs";
import { getViewer } from "@/server/viewer";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { MemberList } from "@/components/book-clubs/member-list";
import { InviteLinkDialog } from "@/components/book-clubs/invite-link-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="bg-cream-100 min-h-screen">
      <BookClubNav
        bookClubId={bookClubId}
        bookClubName={bookClub.name}
        userName={viewer.name}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Members</CardTitle>
                <p className="text-dark-600 mt-1">
                  {bookClub.members.length}{" "}
                  {bookClub.members.length === 1 ? "member" : "members"}
                </p>
              </div>
              {bookClub.currentUserIsAdmin && (
                <InviteLinkDialog
                  bookClubId={bookClubId}
                  bookClubName={bookClub.name}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <MemberList
              members={bookClub.members}
              currentUserId={viewer.userId}
              currentUserIsAdmin={bookClub.currentUserIsAdmin}
              bookClubId={bookClubId}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
