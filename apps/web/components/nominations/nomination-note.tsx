import { cn } from "@/lib/utils";

interface NominationNoteProps {
  note: string | null;
  /** Clamp the note to two lines for dense lists. */
  compact?: boolean;
  className?: string;
}

/** A nominator's note (plain text). Nominations are anonymous: no attribution. */
export function NominationNote({
  note,
  compact = false,
  className,
}: NominationNoteProps) {
  if (!note) return null;

  return (
    <figure className={cn("border-sage-600/40 border-l-2 pl-3", className)}>
      <blockquote
        className={cn(
          "font-inria text-dark-900 whitespace-pre-wrap italic",
          compact ? "line-clamp-2 text-xs" : "text-sm"
        )}
      >
        {note}
      </blockquote>
    </figure>
  );
}
