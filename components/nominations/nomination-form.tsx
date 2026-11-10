"use client";

import { useState } from "react";
import { BookSearch } from "@/components/books/book-search";
import { BookCard } from "@/components/books/book-card";
import { Button } from "@/components/ui/button";
import { nominateBook } from "@/app/actions/nominations";
import { useAction } from "@/hooks/use-action";
import { useRouter } from "next/navigation";
import type { BookSearchResult } from "@/lib/open-library";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import type { MeetingBookOption } from "@/server/meetings";
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
  const [success, setSuccess] = useState(false);
  const {
    run: nominate,
    pending: isSubmitting,
    error: submitError,
    reset,
  } = useAction(nominateBook, {
    refresh: false,
    onSuccess: () => {
      setSuccess(true);
      setSelectedBook(null);
      setNote("");
      // Show the confirmation briefly, then the updated nominations.
      setTimeout(() => {
        router.refresh();
        setSuccess(false);
      }, 2000);
    },
  });

  // Another work with the same title and author counts as the same book.
  const alreadyNominated =
    selectedBook !== null &&
    existingNominations.some(
      (nom) =>
        nom.book.title.toLowerCase() === selectedBook.title.toLowerCase() &&
        nom.book.author.toLowerCase() === selectedBook.author.toLowerCase()
    );
  const error = alreadyNominated
    ? "This book has already been nominated for this meeting."
    : submitError;

  function handleNominate() {
    if (!selectedBook || alreadyNominated) return;
    nominate(meetingId, selectedBook, note);
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
              disabled={isSubmitting || alreadyNominated}
              className="bg-rust-600 hover:bg-rust-700 text-cream-100 flex-1"
            >
              {isSubmitting ? "Nominating..." : "Nominate This Book"}
            </Button>
            <Button
              onClick={() => {
                setSelectedBook(null);
                setNote("");
                reset();
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
