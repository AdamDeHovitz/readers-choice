"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logPastMeeting } from "@/app/actions/meetings";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookSearch } from "@/components/books/book-search";
import type { BookSearchResult } from "@/lib/google-books";

interface LogPastMeetingDialogProps {
  bookClubId: string;
}

export function LogPastMeetingDialog({
  bookClubId,
}: LogPastMeetingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "book">("details");
  const [meetingDate, setMeetingDate] = useState("");
  const [themeName, setThemeName] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetDialog() {
    setStep("details");
    setMeetingDate("");
    setThemeName("");
    setSelectedBook(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!selectedBook || !meetingDate) return;

    setError(null);
    setIsSubmitting(true);

    // First, add book to database
    const bookResult = await addBookToDatabase(selectedBook);

    if (bookResult.error) {
      setError(bookResult.error);
      setIsSubmitting(false);
      return;
    }

    // Then log the past meeting
    const result = await logPastMeeting(
      bookClubId,
      meetingDate,
      themeName || null,
      bookResult.bookId!
    );

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setOpen(false);
      resetDialog();
      setIsSubmitting(false);
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Log Past Meeting</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Past Meeting</DialogTitle>
          <DialogDescription>
            Add a meeting that already happened to your book club history.
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pastMeetingDate">Meeting Date</Label>
              <Input
                id="pastMeetingDate"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pastThemeName">Theme (Optional)</Label>
              <Input
                id="pastThemeName"
                type="text"
                placeholder="e.g., Science Fiction, Historical Fiction..."
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep("book")}
                disabled={!meetingDate}
              >
                Next: Select Book
              </Button>
            </div>
          </div>
        )}

        {step === "book" && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Date:</span>{" "}
                {new Date(meetingDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {themeName && (
                <p className="text-sm text-slate-700 mt-1">
                  <span className="font-medium">Theme:</span> {themeName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Search for the book you read</Label>
              <BookSearch
                onSelectBook={setSelectedBook}
                selectedBookId={selectedBook?.id}
              />
            </div>

            {selectedBook && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Selected: {selectedBook.title}
                </p>
                <p className="text-sm text-blue-700">
                  by {selectedBook.author}
                </p>
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
                onClick={() => setStep("details")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedBook || isSubmitting}
              >
                {isSubmitting ? "Logging..." : "Log Meeting"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
