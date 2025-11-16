import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookClubDetails } from "@/app/actions/book-clubs";
import { BookClubNav } from "@/components/navigation/book-club-nav";
import { MemberList } from "@/components/book-clubs/member-list";
import { InviteLinkDialog } from "@/components/book-clubs/invite-link-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id: bookClubId } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  const bookClub = await getBookClubDetails(bookClubId);

  if (!bookClub) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <BookClubNav
        bookClubId={bookClubId}
        bookClubName={bookClub.name}
        userName={session.user.name || "User"}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              currentUserId={session.user.id!}
              currentUserIsAdmin={bookClub.currentUserIsAdmin}
              bookClubId={bookClubId}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
