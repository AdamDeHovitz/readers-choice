import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavTabs, type NavSection } from "./nav-tabs";

interface AppShellProps {
  /** Shown in the top bar: the club's name, or the app name. */
  title: string;
  /** Adds a back chevron to the top bar. */
  back?: { href: string; label: string };
  /** The signed-in user's name, or null for a signed-out visitor (no tabs). */
  userName: string | null;
  section: NavSection;
  children: React.ReactNode;
}

/**
 * The frame around every app page: a sticky top bar, the page column, and
 * the section's tabs (bottom bar on phones, in the top bar from md up).
 * Rendered by layouts, so pages only render their own content.
 */
export function AppShell({
  title,
  back,
  userName,
  section,
  children,
}: AppShellProps) {
  const signedIn = userName !== null;
  const homeHref =
    section.kind === "club" ? `/book-clubs/${section.clubId}` : "/dashboard";

  return (
    <div className="min-h-dvh">
      {/* The brand colour on every screen. Tabs below stay light so the
          active tab and primary actions stand out. */}
      <header className="bg-sage-600 border-sage-700 text-dark-900 pt-safe sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-(--header-height) max-w-5xl items-center gap-2 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {back && (
              <Link
                href={back.href}
                aria-label={back.label}
                title={back.label}
                className="hover:bg-dark-900/10 -ml-2 flex size-10 shrink-0 items-center justify-center rounded-full"
              >
                <ChevronLeftIcon className="size-6" aria-hidden />
              </Link>
            )}
            <Link
              href={signedIn ? homeHref : "/"}
              className="font-display truncate text-lg"
            >
              {title}
            </Link>
          </div>
          {signedIn && <NavTabs section={section} placement="header" />}
          {!signedIn ? (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          ) : (
            // The app section has a Settings tab; clubs reach it here.
            section.kind === "club" && <AccountLink name={userName} />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6 pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+2rem)] md:pb-16">
        {children}
      </main>

      {signedIn && <NavTabs section={section} placement="bottom" />}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function AccountLink({ name }: { name: string }) {
  return (
    <Link
      href="/settings"
      aria-label="Account and settings"
      title={name}
      className="bg-cream-50/80 text-dark-900 hover:bg-cream-50 ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
    >
      {initials(name)}
    </Link>
  );
}
