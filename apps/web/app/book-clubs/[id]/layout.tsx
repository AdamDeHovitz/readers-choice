import { AppShell } from "@/components/shell/app-shell";
import { getBookClubDetails } from "@/server/clubs";
import { countPendingJoinRequests } from "@/server/join-requests";
import { getViewer } from "@/server/viewer";

/**
 * Club shell: the club's tabs for members. Visitors (signed out, or not a
 * member) get the plain app shell around the page's join prompt. Admins
 * see how many join requests are waiting on the Members tab.
 */
export default async function BookClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const [viewer, { id }] = await Promise.all([getViewer(), params]);
  const bookClub = await getBookClubDetails(viewer, id);

  if (viewer && bookClub?.currentUserIsMember) {
    const pendingJoinRequests = bookClub.currentUserIsAdmin
      ? await countPendingJoinRequests(viewer.db, id)
      : 0;
    return (
      <AppShell
        title={bookClub.name}
        back={{ href: "/dashboard", label: "My clubs" }}
        userName={viewer.name}
        section={{ kind: "club", clubId: id, pendingJoinRequests }}
      >
        {children}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Readers' Choice"
      userName={viewer?.name ?? null}
      section={{ kind: "app" }}
    >
      {children}
    </AppShell>
  );
}
