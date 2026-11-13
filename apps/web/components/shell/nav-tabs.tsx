"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  CompassIcon,
  HomeIcon,
  LibraryIcon,
  SettingsIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ClubTab = "home" | "schedule" | "rankings" | "themes" | "members";

/** Which set of top-level destinations the shell shows. */
export type NavSection =
  | { kind: "app" }
  | {
      kind: "club";
      clubId: string;
      /** Force a tab active, for pages outside the club's URL space. */
      activeTab?: ClubTab;
      /** Requests waiting on an admin, counted on the Members tab. */
      pendingJoinRequests?: number;
    };

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Also active on these path prefixes. */
  matches?: string[];
  exact?: boolean;
  /** Something waiting on the viewer here, e.g. join requests. */
  count?: number;
}

function navItems(section: NavSection): NavItem[] {
  if (section.kind === "app") {
    return [
      {
        key: "clubs",
        label: "My clubs",
        href: "/dashboard",
        icon: LibraryIcon,
      },
      { key: "browse", label: "Browse", href: "/browse", icon: CompassIcon },
      {
        key: "settings",
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
      },
    ];
  }
  const base = `/book-clubs/${section.clubId}`;
  return [
    { key: "home", label: "Home", href: base, icon: HomeIcon, exact: true },
    {
      key: "schedule",
      label: "Schedule",
      href: `${base}/schedule`,
      icon: CalendarDaysIcon,
    },
    {
      key: "rankings",
      label: "Rankings",
      href: `${base}/rankings`,
      icon: TrophyIcon,
      matches: [`${base}/global-rankings`],
    },
    {
      key: "themes",
      label: "Themes",
      href: `${base}/themes`,
      icon: SparklesIcon,
    },
    {
      key: "members",
      label: "Members",
      href: `${base}/members`,
      icon: UsersIcon,
      count: section.pendingJoinRequests,
    },
  ];
}

function isActive(item: NavItem, pathname: string, section: NavSection) {
  if (section.kind === "club" && section.activeTab) {
    return item.key === section.activeTab;
  }
  const under = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");
  if (item.exact) return pathname === item.href;
  return under(item.href) || (item.matches ?? []).some(under);
}

/**
 * Top-level navigation. One list of destinations, two placements: a bottom
 * tab bar on phones and inline tabs in the header from md up.
 */
export function NavTabs({
  section,
  placement,
}: {
  section: NavSection;
  placement: "bottom" | "header";
}) {
  const pathname = usePathname();
  const items = navItems(section);

  if (placement === "header") {
    return (
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {items.map((item) => {
          const active = isActive(item, pathname, section);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors",
                active
                  ? "bg-dark-900/15 text-dark-900"
                  : "text-dark-900/75 hover:bg-dark-900/10 hover:text-dark-900"
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
              <CountBadge count={item.count} />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Main"
      className="bg-background/90 border-border pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-lg md:hidden"
    >
      <ul className="flex h-(--tab-bar-height)">
        {items.map((item) => {
          const active = isActive(item, pathname, section);
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors",
                  active ? "text-primary" : "text-dark-500"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-rust-100"
                  )}
                >
                  <CountBadge
                    count={item.count}
                    className="absolute -top-1 right-1"
                  />
                  <item.icon
                    className="size-5"
                    strokeWidth={active ? 2.25 : 1.75}
                    aria-hidden
                  />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A small count beside a tab; nothing when there's nothing waiting. */
function CountBadge({
  count,
  className,
}: {
  count: number | undefined;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold",
        className
      )}
    >
      {count > 9 ? "9+" : count}
      <span className="sr-only"> waiting</span>
    </span>
  );
}
