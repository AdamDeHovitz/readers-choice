"use client";

import { useState } from "react";
import { BookSearch } from "@/components/books/book-search";
import { BookCard } from "@/components/books/book-card";
import { Button } from "@/components/ui/button";
import { nominateBook } from "@/app/actions/nominations";
import { useRouter } from "next/navigation";
import type { BookSearchResult } from "@/lib/google-books";
import { CheckCircle2 } from "lucide-react";

interface ExistingNomination {
  id: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
  added_by: string;
}

interface NominationFormProps {
  meetingId: string;
  bookClubId: string;
  existingNominations: ExistingNomination[];
}

export function NominationForm({
  meetingId,
  bookClubId,
  existingNominations,
}: NominationFormProps) {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    null
  );
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

    const result = await nominateBook(meetingId, selectedBook);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setSuccess(true);
      setIsSubmitting(false);
      setSelectedBook(null);
      // Refresh the page after a short delay to show the new nomination
      setTimeout(() => {
        router.refresh();
        setSuccess(false);
      }, 2000);
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-dark-900 mb-2">
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
        <h3 className="text-lg font-semibold text-dark-900 mb-3">
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
          <h3 className="text-lg font-semibold text-dark-900 mb-3">
            Already Nominated
          </h3>
          <div className="space-y-2">
            {existingNominations.map((nomination) => (
              <BookCard
                key={nomination.id}
                title={nomination.book.title}
                author={nomination.book.author}
                coverUrl={nomination.book.cover_url || undefined}
                onClick={() => {}}
                disabled
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected Book Preview */}
      {selectedBook && (
        <div className="border-t border-gold-200 pt-6">
          <h3 className="text-lg font-semibold text-dark-900 mb-3">
            Selected Book
          </h3>
          <BookCard
            title={selectedBook.title}
            author={selectedBook.author}
            coverUrl={selectedBook.coverUrl}
            publishedYear={selectedBook.publishedYear}
            onClick={() => {}}
            selected
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleNominate}
              disabled={isSubmitting}
              className="flex-1 bg-rust-600 hover:bg-rust-700 text-cream-100"
            >
              {isSubmitting ? "Nominating..." : "Nominate This Book"}
            </Button>
            <Button
              onClick={() => {
                setSelectedBook(null);
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
