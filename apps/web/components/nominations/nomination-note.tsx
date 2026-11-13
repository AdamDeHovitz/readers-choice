import { cn } from "@/lib/utils";

interface NominationNoteProps {
  note: string | null;
  /** Shown only to admins; nominations are otherwise anonymous. */
  nominatorName?: string | null;
  /** Clamp the note to two lines for dense lists. */
  compact?: boolean;
  className?: string;
}

/**
 * A nominator's note (plain text), attributed only when `nominatorName` is
 * given, which the server does for club admins alone.
 */
export function NominationNote({
  note,
  nominatorName,
  compact = false,
  className,
}: NominationNoteProps) {
  if (!note && !nominatorName) return null;

  const attribution = nominatorName && (
    <span className="text-dark-500 text-xs">Nominated by {nominatorName}</span>
  );

  if (!note) return <p className={className}>{attribution}</p>;

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
      {attribution && <figcaption className="mt-1">{attribution}</figcaption>}
    </figure>
  );
}
