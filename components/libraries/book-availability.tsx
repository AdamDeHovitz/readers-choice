import { LibraryIcon } from "lucide-react";
import {
  getBookAvailability,
  summarizeAvailability,
  type Library,
} from "@/lib/libraries/overdrive";
import { AvailabilityButton } from "./availability-button";

interface BookAvailabilityProps {
  title: string;
  author: string;
  /** The user's libraries; empty shows the "choose libraries" prompt. */
  libraries: Library[];
}

/**
 * A pill summarizing the quickest way to borrow this book, opening the full
 * breakdown. Render under Suspense so a slow lookup never blocks voting.
 */
export async function BookAvailability({
  title,
  author,
  libraries,
}: BookAvailabilityProps) {
  if (libraries.length === 0) {
    return (
      <AvailabilityButton
        title={title}
        results={null}
        summary={{ kind: "none" }}
      />
    );
  }
  const results = await getBookAvailability(title, author, libraries);
  return (
    <AvailabilityButton
      title={title}
      results={results}
      summary={summarizeAvailability(results)}
    />
  );
}

export function BookAvailabilityFallback() {
  return (
    <div
      role="status"
      className="font-inria border-dark-900/10 bg-card flex w-full max-w-sm items-center gap-3 rounded-lg border px-3 py-2"
    >
      <LibraryIcon className="text-dark-500 size-4 shrink-0" aria-hidden />
      <span className="flex-1 space-y-1.5" aria-label="Checking your libraries">
        <span className="bg-cream-200 block h-3 w-24 animate-pulse rounded" />
        <span className="bg-cream-200 block h-2.5 w-40 animate-pulse rounded" />
      </span>
    </div>
  );
}
