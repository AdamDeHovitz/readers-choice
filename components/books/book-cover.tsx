import Image from "next/image";
import { cn } from "@/lib/utils";

type BookCoverSize = "xs" | "sm" | "md" | "lg";

interface BookCoverSizeConfig {
  width: number;
  height: number;
  frame: string;
  icon: string;
  image: string;
  placeholder: string;
}

const SIZE_CONFIG: Record<BookCoverSize, BookCoverSizeConfig> = {
  xs: {
    width: 32,
    height: 48,
    frame: "h-12 w-8 rounded",
    icon: "h-4 w-4",
    image: "shadow-sm",
    placeholder: "",
  },
  sm: {
    width: 64,
    height: 96,
    frame: "h-24 w-16 rounded",
    icon: "h-8 w-8",
    image: "shadow-sm",
    placeholder: "",
  },
  md: {
    width: 80,
    height: 120,
    frame: "h-30 w-20 rounded",
    icon: "h-10 w-10",
    image: "shadow-md",
    placeholder: "",
  },
  lg: {
    width: 160,
    height: 240,
    frame: "h-60 w-40 rounded-lg",
    icon: "h-16 w-16",
    image: "shadow-md",
    placeholder: "shadow-md",
  },
};

interface BookCoverProps {
  coverUrl: string | null | undefined;
  title: string;
  size: BookCoverSize;
}

/** Book cover image with a book-icon placeholder when no cover is available. */
export function BookCover({ coverUrl, title, size }: BookCoverProps) {
  const config = SIZE_CONFIG[size];

  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={title}
        width={config.width}
        height={config.height}
        className={cn(config.frame, "object-cover", config.image)}
      />
    );
  }

  return (
    <div
      className={cn(
        config.frame,
        "bg-cream-200 flex items-center justify-center",
        config.placeholder
      )}
    >
      <svg
        className={cn(config.icon, "text-dark-500")}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    </div>
  );
}
