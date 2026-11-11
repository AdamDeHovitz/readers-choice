import Image from "next/image";
import { BookOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BookCoverSize = "xs" | "sm" | "md" | "lg";

interface BookCoverSizeConfig {
  width: number;
  height: number;
  frame: string;
  shadow: string;
  /** Title text on the placeholder cover; null when too small to read. */
  title: string | null;
}

const SIZE_CONFIG: Record<BookCoverSize, BookCoverSizeConfig> = {
  xs: {
    width: 32,
    height: 48,
    frame: "h-12 w-8 rounded",
    shadow: "shadow-sm",
    title: null,
  },
  sm: {
    width: 64,
    height: 96,
    frame: "h-24 w-16 rounded p-1.5",
    shadow: "shadow-sm",
    title: "text-[10px] line-clamp-4",
  },
  md: {
    width: 80,
    height: 120,
    frame: "h-30 w-20 rounded p-2.5",
    shadow: "shadow-md",
    title: "text-xs line-clamp-5",
  },
  lg: {
    width: 160,
    height: 240,
    frame: "h-60 w-40 rounded-lg p-4",
    shadow: "shadow-md",
    title: "text-xl line-clamp-5",
  },
};

interface BookCoverProps {
  coverUrl: string | null | undefined;
  title: string;
  size: BookCoverSize;
}

/**
 * Book cover image. Without one, every size shows the same rust "cloth"
 * cover: the title where it fits, a book glyph at `xs`.
 */
export function BookCover({ coverUrl, title, size }: BookCoverProps) {
  const config = SIZE_CONFIG[size];

  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={title}
        width={config.width}
        height={config.height}
        className={cn(config.frame, "object-cover p-0", config.shadow)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        config.frame,
        config.shadow,
        "from-rust-600 to-rust-800 text-cream-50 flex shrink-0 flex-col overflow-hidden bg-gradient-to-br",
        config.title ? "justify-between" : "items-center justify-center"
      )}
    >
      {config.title ? (
        <>
          <span
            aria-hidden
            className={cn("font-display leading-tight", config.title)}
          >
            {title}
          </span>
          <span aria-hidden className="bg-cream-50/40 h-px w-1/2" />
        </>
      ) : (
        <BookOpenIcon className="size-4 opacity-80" aria-hidden />
      )}
    </div>
  );
}
