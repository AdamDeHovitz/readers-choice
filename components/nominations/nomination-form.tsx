"use client";

import { useState } from "react";
import { BookSearch } from "@/components/books/book-search";
import { BookCard } from "@/components/books/book-card";
import { Button } from "@/components/ui/button";
import { nominateBook } from "@/app/actions/nominations";
import { useRouter } from "next/navigation";
import type { BookSearchResult } from "@/lib/open-library";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import type { MeetingBookOption } from "@/components/meetings/types";
import { NominationNote } from "./nomination-note";
import { NominationNoteField } from "./nomination-note-field";
import { EditableNominationNote } from "./editable-nomination-note";

interface NominationFormProps {
  meetingId: string;
  existingNominations: MeetingBookOption[];
  currentUserId: string;
}

export function NominationForm({
  meetingId,
  existingNominations,
  currentUserId,
}: NominationFormProps) {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    null
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if a book is already nominated
  const isAlreadyNominated = (bookTitle: string, bookAuthor: string) => {
    return existingNominations.some(
      (nom) =>
        nom.book.title.toLowerCase() === bookTitle.toLowerCase() &&
        nom.book.author.toLowerCase() === bookAuthor.toLowerCase()
    );
  };

  async function handleNominate() {
    if (!selectedBook) return;

    // Check if already nominated
    if (isAlreadyNominated(selectedBook.title, selectedBook.author)) {
      setError("This book has already been nominated for this meeting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await nominateBook(meetingId, selectedBook, note);

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setSuccess(true);
      setIsSubmitting(false);
      setSelectedBook(null);
      setNote("");
      // Refresh the page after a short delay to show the new nomination
      setTimeout(() => {
        router.refresh();
        setSuccess(false);
      }, 2000);
    }
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="text-rust-600 mx-auto mb-4 h-16 w-16" />
        <h3 className="text-dark-900 mb-2 text-xl font-bold">
          Book Nominated!
        </h3>
        <p className="text-dark-600">
          Your nomination has been submitted successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Book Search */}
      <div>
        <h3 className="text-dark-900 mb-3 text-lg font-semibold">
          {existingNominations.length > 0
            ? "Nominate Another Book"
            : "Search and Nominate"}
        </h3>
        <BookSearch
          onSelectBook={setSelectedBook}
          selectedBookId={selectedBook?.id}
        />
      </div>

      {/* Already Nominated Books */}
      {existingNominations.length > 0 && (
        <div>
          <h3 className="text-dark-900 mb-3 text-lg font-semibold">
            Already Nominated
          </h3>
          <div className="space-y-2">
            {existingNominations.map((nomination) => (
              <BookCard
                key={nomination.id}
                title={nomination.book.title}
                author={nomination.book.author}
                coverUrl={nomination.book.coverUrl || undefined}
              >
                {nomination.addedBy === currentUserId ? (
                  <EditableNominationNote
                    bookOptionId={nomination.id}
                    note={nomination.nominationNote}
                    nominatorName={nomination.nominatorName}
                  />
                ) : (
                  <NominationNote
                    note={nomination.nominationNote}
                    nominatorName={nomination.nominatorName}
                  />
                )}
              </BookCard>
            ))}
          </div>
        </div>
      )}

      {/* Selected Book Preview */}
      {selectedBook && (
        <div className="border-gold-200 border-t pt-6">
          <h3 className="text-dark-900 mb-3 text-lg font-semibold">
            Selected Book
          </h3>
          <BookCard
            title={selectedBook.title}
            author={selectedBook.author}
            coverUrl={selectedBook.coverUrl}
            publishedYear={selectedBook.publishedYear}
            selected
          />

          <div className="mt-4">
            <NominationNoteField
              id="nomination-note"
              value={note}
              onChange={setNote}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              {error}
            </Alert>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleNominate}
              disabled={isSubmitting}
              className="bg-rust-600 hover:bg-rust-700 text-cream-100 flex-1"
            >
              {isSubmitting ? "Nominating..." : "Nominate This Book"}
            </Button>
            <Button
              onClick={() => {
                setSelectedBook(null);
                setNote("");
                setError(null);
              }}
              variant="outline"
              disabled={isSubmitting}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
