import { AppShell } from "@/components/shell/app-shell";
import { getViewer } from "@/server/viewer";

/** Shell for pages outside any club: My clubs, Browse, Settings. */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
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
