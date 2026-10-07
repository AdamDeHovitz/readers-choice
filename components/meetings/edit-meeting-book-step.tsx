import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BookSearch } from "@/components/books/book-search";
import type { BookSearchResult } from "@/lib/open-library";

interface EditMeetingBookStepProps {
  meetingDate: string;
  themeName: string;
  selectedBook: BookSearchResult | null;
  onSelectBook: (book: BookSearchResult) => void;
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
      <div className="bg-cream-100 border-gold-600/20 rounded-lg border p-3">
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

      <div className="space-y-2">
        <Label>Search for a book</Label>
        <BookSearch
          onSelectBook={onSelectBook}
          selectedBookId={selectedBook?.id}
        />
      </div>

      {selectedBook && (
        <div className="bg-gold-50 border-gold-600 rounded-lg border p-4">
          <p className="font-inria text-dark-900 mb-1 text-sm font-medium">
            Selected: {selectedBook.title}
          </p>
          <p className="text-gold-700 text-sm">by {selectedBook.author}</p>
        </div>
      )}

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
