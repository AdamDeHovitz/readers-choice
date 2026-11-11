import { AppShell } from "@/components/shell/app-shell";
import { getMeetingDetails } from "@/server/meetings";
import { getViewer } from "@/server/viewer";

/** A meeting sits inside its club's shell, under the Schedule tab. */
export default async function MeetingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const [viewer, { id }] = await Promise.all([getViewer(), params]);
  const meeting = viewer ? await getMeetingDetails(viewer, id) : null;

  // The page redirects visitors who can't see this meeting.
  if (!viewer || !meeting) return children;

  const clubId = meeting.bookClub.id;
  return (
    <AppShell
      title={meeting.bookClub.name}
      back={{ href: `/book-clubs/${clubId}/schedule`, label: "Schedule" }}
      userName={viewer.name}
      section={{ kind: "club", clubId, activeTab: "schedule" }}
    >
      {children}
    </AppShell>
  );
}
