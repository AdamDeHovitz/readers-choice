import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BookSearch } from "@/components/books/book-search";
import type { BookSearchResult } from "@/lib/open-library";

interface EditMeetingBookStepProps {
  meetingDate: string;
  themeName: string;
  selectedBook: BookSearchResult | null;
  onSelectBook: (book: BookSearchResult | null) => void;
  error: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSave: () => void;
}

/** Second step of the edit-meeting dialog: pick a replacement book. */
export function EditMeetingBookStep({
  meetingDate,
  themeName,
  selectedBook,
  onSelectBook,
  error,
  isSubmitting,
  onBack,
  onSave,
}: EditMeetingBookStepProps) {
  return (
    <div className="space-y-4">
      <div className="bg-cream-100 border-border rounded-lg border p-3">
        <p className="text-dark-600 text-sm">
          <span className="font-inria font-medium">Date:</span>{" "}
          {new Date(meetingDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        {themeName && (
          <p className="text-dark-600 mt-1 text-sm">
            <span className="font-inria font-medium">Theme:</span> {themeName}
          </p>
        )}
      </div>

      <BookSearch selectedBook={selectedBook} onSelectBook={onSelectBook} />

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button onClick={onSave} disabled={!selectedBook || isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
