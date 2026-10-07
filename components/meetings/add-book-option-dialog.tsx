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
import type { BookSearchResult } from "@/lib/open-library";
import { Alert } from "@/components/ui/alert";

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
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
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
