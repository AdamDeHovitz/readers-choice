import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SegmentedNavItem {
  label: string;
  href: string;
  active: boolean;
}

/**
 * A row of mutually exclusive links (years, views), styled as a segmented
 * control. Scrolls sideways on narrow screens instead of wrapping.
 */
export function SegmentedNav({
  items,
  label,
  className,
}: {
  items: SegmentedNavItem[];
  /** Accessible name for the group. */
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn("-mx-4 overflow-x-auto px-4", className)}
    >
      <div className="bg-sage-100 inline-flex min-w-max gap-1 rounded-xl p-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            scroll={false}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "font-inria flex h-9 items-center rounded-lg px-4 text-sm font-bold transition-colors",
              item.active
                ? "bg-sage-600 text-dark-900 shadow-sm"
                : "text-sage-800 hover:bg-sage-200"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
