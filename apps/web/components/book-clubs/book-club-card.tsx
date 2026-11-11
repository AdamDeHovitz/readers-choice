import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LocalDate } from "@/components/ui/local-date";
import { cn } from "@/lib/utils";

// Each club keeps one colour (picked from its id) so clubs are easy to tell
// apart at a glance.
const TILE_COLORS = [
  "bg-rust-600 text-cream-50",
  "bg-sage-600 text-dark-900",
  "bg-dark-700 text-cream-50",
  "bg-rust-300 text-dark-900",
  "bg-sage-800 text-cream-50",
];

function tileColor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
}

interface BookClubCardProps {
  id: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
  joinedAt: string | null;
}

export function BookClubCard({
  id,
  name,
  description,
  isAdmin,
  joinedAt,
}: BookClubCardProps) {
  return (
    <Link
      href={`/book-clubs/${id}`}
      className="bg-card border-border hover:border-dark-900/25 group active:bg-muted flex h-full items-center gap-4 rounded-2xl border p-4 shadow-xs transition-colors"
    >
      <div
        aria-hidden
        className={cn(
          "font-display flex size-12 shrink-0 items-center justify-center rounded-xl text-xl",
          tileColor(id)
        )}
      >
        {name.trim()[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-inria text-foreground truncate text-lg font-bold">
            {name}
          </h2>
          {isAdmin && <Badge>Admin</Badge>}
        </div>
        {description ? (
          <p className="text-muted-foreground line-clamp-1 text-sm">
            {description}
          </p>
        ) : (
          joinedAt && (
            <p className="text-muted-foreground text-sm">
              Joined <LocalDate iso={joinedAt} format="shortMonthYear" />
            </p>
          )
        )}
      </div>
      <ChevronRightIcon
        className="text-dark-500 size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
