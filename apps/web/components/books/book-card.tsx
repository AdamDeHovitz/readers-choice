import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BookCover } from "./book-cover";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  publishedYear?: number;
  /** Makes the whole card a button. */
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Extra content shown under the book info (e.g. a nomination note). */
  children?: ReactNode;
}

export function BookCard({
  title,
  author,
  coverUrl,
  publishedYear,
  onClick,
  disabled = false,
  selected = false,
  children,
}: BookCardProps) {
  // Buttons may only hold phrasing content, so no heading inside one.
  const Title = onClick ? "span" : "h3";
  const card = (
    <Card
      className={cn(
        "py-0",
        onClick && "hover:border-dark-900/25 transition-colors",
        // Inset, so scrolling or overflow-hidden parents can't clip it.
        selected && "ring-rust-600 ring-2 ring-inset",
        disabled && "opacity-60"
      )}
    >
      <CardContent className="p-3">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <BookCover coverUrl={coverUrl} title={title} size="sm" />
          </div>

          <div className="min-w-0 flex-1">
            <Title className="font-inria text-foreground mb-0.5 line-clamp-2 block font-bold">
              {title}
            </Title>
            <p className="text-dark-600 mb-1 text-sm">{author}</p>
            {publishedYear && (
              <p className="text-dark-500 text-xs">{publishedYear}</p>
            )}
            {children && <div className="mt-2">{children}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!onClick) return card;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="block w-full rounded-2xl text-left active:scale-[0.99]"
    >
      {card}
    </button>
  );
}
