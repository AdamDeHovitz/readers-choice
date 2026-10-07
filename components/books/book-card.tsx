import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookCover } from "./book-cover";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  publishedYear?: number;
  onClick?: () => void;
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
  selected = false,
  children,
}: BookCardProps) {
  return (
    <Card
      className={`${onClick ? "cursor-pointer transition-all hover:shadow-md" : ""} ${
        selected ? "ring-rust-600 ring-2" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <BookCover coverUrl={coverUrl} title={title} size="sm" />
          </div>

          {/* Book Info */}
          <div className="min-w-0 flex-1">
            <h3 className="font-inria text-dark-900 mb-1 line-clamp-2 font-medium">
              {title}
            </h3>
            <p className="text-dark-600 mb-1 text-sm">{author}</p>
            {publishedYear && (
              <p className="text-dark-500 text-xs">{publishedYear}</p>
            )}
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
