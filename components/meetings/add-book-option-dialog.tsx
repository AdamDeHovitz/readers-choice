"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBookOption } from "@/app/actions/meetings";
import { addBookToDatabase } from "@/app/actions/books";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookSearch } from "@/components/books/book-search";
import type { BookSearchResult } from "@/lib/google-books";

interface AddBookOptionDialogProps {
  meetingId: string;
}

export function AddBookOptionDialog({ meetingId }: AddBookOptionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddBook() {
    if (!selectedBook) return;

    setError(null);
    setIsSubmitting(true);

    // First, add book to database
    const bookResult = await addBookToDatabase(selectedBook);

    if (bookResult.error) {
      setError(bookResult.error);
      setIsSubmitting(false);
      return;
    }

    // Then add as option to meeting
    const optionResult = await addBookOption(meetingId, bookResult.bookId!);

    if (optionResult.error) {
      setError(optionResult.error);
      setIsSubmitting(false);
    } else {
      setOpen(false);
      setSelectedBook(null);
      setIsSubmitting(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Book Option</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Book Option</DialogTitle>
          <DialogDescription>
            Search for a book to add as an option for this meeting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <BookSearch
            onSelectBook={setSelectedBook}
            selectedBookId={selectedBook?.id}
          />

          {selectedBook && (
            <div className="p-4 bg-gold-50 border border-gold-600 rounded-lg">
              <p className="text-sm font-medium font-inria text-dark-900 mb-1">
                Selected: {selectedBook.title}
              </p>
              <p className="text-sm text-gold-700">by {selectedBook.author}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSelectedBook(null);
                setError(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBook}
              disabled={!selectedBook || isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Book"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
