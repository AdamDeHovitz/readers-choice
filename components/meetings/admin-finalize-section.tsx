import { Button } from "@/components/ui/button";
import type { MeetingBookOption } from "./types";

interface AdminFinalizeSectionProps {
  bookOptions: MeetingBookOption[];
  finalizingBookId: string | null;
  onFinalize: (bookId: string) => void;
}

/** Admin-only row of buttons for picking the winning book and finalizing the meeting. */
export function AdminFinalizeSection({
  bookOptions,
  finalizingBookId,
  onFinalize,
}: AdminFinalizeSectionProps) {
  return (
    <div className="border-gold-600/20 mt-4 border-t pt-4">
      <p className="text-dark-600 mb-2 text-sm">
        Admin: Select winning book to finalize
      </p>
      <div className="flex flex-wrap gap-2">
        {bookOptions.map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant="outline"
            onClick={() => onFinalize(option.book.id)}
            disabled={finalizingBookId === option.book.id}
          >
            {finalizingBookId === option.book.id ? "..." : option.book.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
