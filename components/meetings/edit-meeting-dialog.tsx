"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeeting, deleteMeeting } from "@/app/actions/meetings";
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
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeCombobox } from "@/components/themes/theme-combobox";
import { BookSearch } from "@/components/books/book-search";
import type { BookSearchResult } from "@/lib/open-library";

interface EditMeetingDialogProps {
  meetingId: string;
  bookClubId: string;
  currentDate: string;
  currentNominationDeadline?: string | null;
  currentVotingDeadline?: string | null;
  currentTheme: string | null;
  currentDetails?: string | null;
  currentBook: {
    id: string;
    title: string;
    author: string;
  } | null;
}

export function EditMeetingDialog({
  meetingId,
  bookClubId,
  currentDate,
  currentNominationDeadline,
  currentVotingDeadline,
  currentTheme,
  currentDetails,
  currentBook,
}: EditMeetingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "book">("details");

  // Format date for datetime-local input
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const initialDate = new Date(currentDate);
  const formattedDate = formatDateForInput(currentDate);

  const [meetingDate, setMeetingDate] = useState(formattedDate);
  const [nominationDeadline, setNominationDeadline] = useState(
    currentNominationDeadline
      ? formatDateForInput(currentNominationDeadline)
      : ""
  );
  const [votingDeadline, setVotingDeadline] = useState(
    currentVotingDeadline ? formatDateForInput(currentVotingDeadline) : ""
  );
  const [themeName, setThemeName] = useState(currentTheme || "");
  const [details, setDetails] = useState(currentDetails || "");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    currentBook
      ? {
          id: currentBook.id,
          title: currentBook.title,
          author: currentBook.author,
          externalId: currentBook.id,
          externalSource: "open_library" as const,
        }
      : null
  );
  const [changeBook, setChangeBook] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetDialog() {
    setStep("details");
    setMeetingDate(formattedDate);
    setNominationDeadline(
      currentNominationDeadline
        ? formatDateForInput(currentNominationDeadline)
        : ""
    );
    setVotingDeadline(
      currentVotingDeadline ? formatDateForInput(currentVotingDeadline) : ""
    );
    setThemeName(currentTheme || "");
    setDetails(currentDetails || "");
    setSelectedBook(
      currentBook
        ? {
            id: currentBook.id,
            title: currentBook.title,
            author: currentBook.author,
            externalId: currentBook.id,
            externalSource: "open_library" as const,
          }
        : null
    );
    setChangeBook(false);
    setError(null);
  }

  async function handleSubmit() {
    if (!meetingDate) return;

    setError(null);
    setIsSubmitting(true);

    let bookId = currentBook?.id || null;

    // If user wants to change the book and selected a new one
    if (changeBook && selectedBook && selectedBook.id !== currentBook?.id) {
      const bookResult = await addBookToDatabase(selectedBook);
      if (bookResult.error) {
        setError(bookResult.error);
        setIsSubmitting(false);
        return;
      }
      bookId = bookResult.bookId!;
    }

    // Update meeting
    const result = await updateMeeting(
      meetingId,
      new Date(meetingDate).toISOString(),
      nominationDeadline ? new Date(nominationDeadline).toISOString() : null,
      votingDeadline ? new Date(votingDeadline).toISOString() : null,
      themeName || null,
      bookId,
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

  async function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete this meeting? This action cannot be undone."
      )
    ) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await deleteMeeting(meetingId);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setOpen(false);
      resetDialog();
      setIsSubmitting(false);
      // Redirect to schedule page after deletion
      router.push(
        window.location.pathname.replace(/\/meetings\/.*/, "/schedule")
      );
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
        <Button variant="outline" size="sm">
          Edit Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Meeting</DialogTitle>
          <DialogDescription>
            Update the meeting date, theme, or selected book.
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editMeetingDate">Meeting Date & Time</Label>
              <DateTimePicker
                id="editMeetingDate"
                value={meetingDate}
                onChange={setMeetingDate}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editThemeName">Theme (Optional)</Label>
              <ThemeCombobox
                bookClubId={bookClubId}
                value={themeName}
                onChange={setThemeName}
                id="editThemeName"
              />
              <p className="text-dark-500 text-xs">
                Popular unused themes shown first
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDetails">Details (Optional)</Label>
              <Textarea
                id="editDetails"
                placeholder="e.g., Read the first half only, specific chapters to discuss..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
              />
              <p className="text-dark-500 text-xs">
                Add any additional details or instructions for this meeting
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNominationDeadline">
                Nomination Deadline (Optional)
              </Label>
              <DateTimePicker
                id="editNominationDeadline"
                value={nominationDeadline}
                onChange={setNominationDeadline}
              />
              <p className="text-dark-500 text-xs">
                When should nominations close? After this, members can only
                vote.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editVotingDeadline">
                Voting Deadline (Optional)
              </Label>
              <DateTimePicker
                id="editVotingDeadline"
                value={votingDeadline}
                onChange={setVotingDeadline}
              />
              <p className="text-dark-500 text-xs">
                When should voting close? Usually set to meeting time.
              </p>
            </div>

            {currentBook && (
              <div className="space-y-2">
                <Label>Current Book</Label>
                <div className="bg-cream-100 border-gold-600/20 rounded-lg border p-3">
                  <p className="font-inria text-dark-900 text-sm font-medium">
                    {currentBook.title}
                  </p>
                  <p className="text-dark-600 text-sm">
                    by {currentBook.author}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="changeBook"
                    checked={changeBook}
                    onChange={(e) => setChangeBook(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="changeBook" className="cursor-pointer">
                    Change book
                  </Label>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Delete Meeting
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                {changeBook ? (
                  <Button
                    onClick={() => setStep("book")}
                    disabled={!meetingDate}
                  >
                    Next: Select Book
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </div>
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
              <Label>Search for a book</Label>
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

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

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
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
