import { cn } from "@/lib/utils";

interface NominationNoteProps {
  note: string | null;
  nominatorName: string | null;
  /** Clamp the note to two lines for dense lists. */
  compact?: boolean;
  className?: string;
}

/** A nominator's note (plain text) with attribution. */
export function NominationNote({
  note,
  nominatorName,
  compact = false,
  className,
}: NominationNoteProps) {
  if (!note) {
    return nominatorName ? (
      <p className={cn("text-dark-500 text-xs", className)}>
        Nominated by {nominatorName}
      </p>
    ) : null;
  }

  return (
    <figure className={cn("border-gold-600/40 border-l-2 pl-3", className)}>
      <blockquote
        className={cn(
          "font-inria text-dark-900 whitespace-pre-wrap italic",
          compact ? "line-clamp-2 text-xs" : "text-sm"
        )}
      >
        {note}
      </blockquote>
      {nominatorName && (
        <figcaption className="text-dark-500 mt-1 text-xs">
          — {nominatorName}
        </figcaption>
      )}
    </figure>
  );
}
