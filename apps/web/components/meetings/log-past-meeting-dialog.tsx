"use client";

import { useState } from "react";
import { logPastMeeting } from "@/app/actions/meetings";
import { useAction } from "@/hooks/use-action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeCombobox } from "@/components/themes/theme-combobox";
import { BookSearch } from "@/components/books/book-search";
import type { BookSearchResult } from "@readers-choice/core/open-library";
import { Alert } from "@/components/ui/alert";
import { fromDateTimeInput } from "@readers-choice/core/datetime-input";
import { DEFAULT_MEETING_TIME } from "@readers-choice/core/meeting-defaults";

interface LogPastMeetingDialogProps {
  bookClubId: string;
}

export function LogPastMeetingDialog({
  bookClubId,
}: LogPastMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "book">("details");
  const [meetingDate, setMeetingDate] = useState("");
  const [themeName, setThemeName] = useState("");
  const [details, setDetails] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    null
  );
  const {
    run: logMeeting,
    pending: isSubmitting,
    error,
    reset,
  } = useAction(logPastMeeting, {
    onSuccess: () => {
      setOpen(false);
      resetDialog();
    },
  });

  function resetDialog() {
    setStep("details");
    setMeetingDate("");
    setThemeName("");
    setDetails("");
    setSelectedBook(null);
    reset();
  }

  function handleSubmit() {
    if (!selectedBook || !meetingDate) return;
    logMeeting(
      bookClubId,
      { meetingDate: fromDateTimeInput(meetingDate) ?? "", themeName, details },
      selectedBook
    );
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
        <Button variant="outline">
          <HistoryIcon aria-hidden />
          Log past meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Log Past Meeting</DialogTitle>
          <DialogDescription>
            Add a meeting that already happened to your book club history.
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pastMeetingDate">Meeting Date & Time</Label>
              <DateTimeField
                id="pastMeetingDate"
                value={meetingDate}
                onChange={setMeetingDate}
                defaultTime={DEFAULT_MEETING_TIME}
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

            <DialogFooter>
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
            </DialogFooter>
          </div>
        )}

        {step === "book" && (
          <div className="space-y-4">
            <div className="bg-cream-100 border-border rounded-lg border p-3">
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

            <BookSearch
              label="Search for the book you read"
              selectedBook={selectedBook}
              onSelectBook={setSelectedBook}
            />

            {error && <Alert variant="destructive">{error}</Alert>}

            <DialogFooter>
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
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
