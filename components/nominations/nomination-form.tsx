"use client";

import { useState } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { BookSearch } from "@/components/books/book-search";
import { BookCard } from "@/components/books/book-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { nominateBook } from "@/app/actions/nominations";
import { useAction } from "@/hooks/use-action";
import type { BookSearchResult } from "@/lib/open-library";
import type { MeetingBookOption } from "@/server/meetings";
import { NominationNote } from "./nomination-note";
import { NominationNoteField } from "./nomination-note-field";
import { EditableNominationNote } from "./editable-nomination-note";

interface NominationFormProps {
  meetingId: string;
  existingNominations: MeetingBookOption[];
  currentUserId: string;
}

/**
 * Search, tap a book, optionally add a note, nominate. The note and button
 * appear right under the picked book; the new nomination then shows in the
 * list below, where its note stays editable.
 */
export function NominationForm({
  meetingId,
  existingNominations,
  currentUserId,
}: NominationFormProps) {
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    null
  );
  const [note, setNote] = useState("");
  const [justNominated, setJustNominated] = useState<string | null>(null);
  // Bumped after each nomination to remount the search with an empty box.
  const [searchKey, setSearchKey] = useState(0);
  const {
    run: nominate,
    pending: isSubmitting,
    error,
    reset,
  } = useAction(nominateBook);

  async function submit(book: BookSearchResult) {
    const result = await nominate(meetingId, book, note);
    if (!result.success) return;
    setJustNominated(book.title);
    setSelectedBook(null);
    setNote("");
    setSearchKey((key) => key + 1);
  }

  // Another work with the same title and author counts as the same book.
  function alreadyNominated(book: BookSearchResult) {
    return existingNominations.some(
      (nom) =>
        nom.book.title.toLowerCase() === book.title.toLowerCase() &&
        nom.book.author.toLowerCase() === book.author.toLowerCase()
    )
      ? "Already nominated"
      : null;
  }

  function selectBook(book: BookSearchResult | null) {
    setSelectedBook(book);
    setJustNominated(null);
    reset();
  }

  return (
    <div className="space-y-6">
      {justNominated && (
        <Alert className="flex items-center gap-2" aria-live="polite">
          <CheckCircle2Icon className="text-rust-600 size-4 shrink-0" />
          <span>
            You nominated <strong>{justNominated}</strong>. Nominate another, or
            edit your note below.
          </span>
        </Alert>
      )}

      <BookSearch
        key={searchKey}
        selectedBook={selectedBook}
        onSelectBook={selectBook}
        unavailableReason={alreadyNominated}
      >
        {selectedBook && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit(selectedBook);
            }}
          >
            <NominationNoteField
              id="nomination-note"
              value={note}
              onChange={setNote}
              disabled={isSubmitting}
            />
            {error && <Alert variant="destructive">{error}</Alert>}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Nominating…" : `Nominate ${selectedBook.title}`}
            </Button>
          </form>
        )}
      </BookSearch>

      {existingNominations.length > 0 && (
        <div>
          <h3 className="text-foreground mb-3 font-bold">
            Nominated so far ({existingNominations.length})
          </h3>
          <ul className="space-y-2">
            {existingNominations.map((nomination) => (
              <li key={nomination.id}>
                <BookCard
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
