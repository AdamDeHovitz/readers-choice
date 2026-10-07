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
import { Textarea } from "@/components/ui/textarea";
import { ThemeCombobox } from "@/components/themes/theme-combobox";
import { BookSearch } from "@/components/books/book-search";
import type { BookSearchResult } from "@/lib/open-library";
import { Alert } from "@/components/ui/alert";

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
  const [details, setDetails] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetDialog() {
    setStep("details");
    setMeetingDate("");
    setThemeName("");
    setDetails("");
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
      bookResult.bookId!,
      details || null
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
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
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
              <ThemeCombobox
                bookClubId={bookClubId}
                value={themeName}
                onChange={setThemeName}
                id="pastThemeName"
              />
              <p className="text-dark-500 text-xs">
                Popular unused themes shown first
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pastDetails">Details (Optional)</Label>
              <Textarea
                id="pastDetails"
                placeholder="e.g., Read the first half only, specific chapters to discuss..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
              />
              <p className="text-dark-500 text-xs">
                Add any additional details or instructions for this meeting
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setStep("book")} disabled={!meetingDate}>
                Next: Select Book
              </Button>
            </div>
          </div>
        )}

        {step === "book" && (
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
                  <span className="font-inria font-medium">Theme:</span>{" "}
                  {themeName}
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
              <div className="bg-gold-50 border-gold-600 rounded-lg border p-4">
                <p className="font-inria text-dark-900 mb-1 text-sm font-medium">
                  Selected: {selectedBook.title}
                </p>
                <p className="text-gold-700 text-sm">
                  by {selectedBook.author}
                </p>
              </div>
            )}

            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="flex justify-end gap-2">
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
