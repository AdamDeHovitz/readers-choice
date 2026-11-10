"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeeting, deleteMeeting } from "@/app/actions/meetings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fromDateTimeInput, toDateTimeInput } from "@/lib/datetime-input";
import type { BookSearchResult } from "@/lib/open-library";
import {
  EditMeetingDetailsStep,
  type EditMeetingFormValues,
} from "./edit-meeting-details-step";
import { EditMeetingBookStep } from "./edit-meeting-book-step";

interface CurrentBook {
  id: string;
  title: string;
  author: string;
}

interface EditMeetingDialogProps {
  meetingId: string;
  bookClubId: string;
  currentDate: string;
  currentNominationDeadline?: string | null;
  currentVotingDeadline?: string | null;
  currentTheme: string | null;
  currentDetails?: string | null;
  currentBook: CurrentBook | null;
}

function toBookSearchResult(book: CurrentBook | null): BookSearchResult | null {
  return book
    ? {
        id: book.id,
        title: book.title,
        author: book.author,
        externalId: book.id,
        externalSource: "open_library" as const,
      }
    : null;
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

  function getInitialValues(): EditMeetingFormValues {
    return {
      meetingDate: toDateTimeInput(currentDate),
      nominationDeadline: currentNominationDeadline
        ? toDateTimeInput(currentNominationDeadline)
        : "",
      votingDeadline: currentVotingDeadline
        ? toDateTimeInput(currentVotingDeadline)
        : "",
      themeName: currentTheme || "",
      details: currentDetails || "",
    };
  }

  const [values, setValues] = useState<EditMeetingFormValues>(getInitialValues);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    () => toBookSearchResult(currentBook)
  );
  const [changeBook, setChangeBook] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    meetingDate,
    nominationDeadline,
    votingDeadline,
    themeName,
    details,
  } = values;

  function handleValueChange(
    field: keyof EditMeetingFormValues,
    value: string
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetDialog() {
    setStep("details");
    setValues(getInitialValues());
    setSelectedBook(toBookSearchResult(currentBook));
    setChangeBook(false);
    setError(null);
  }

  async function handleSubmit() {
    if (!meetingDate) return;

    setError(null);
    setIsSubmitting(true);

    const newBook =
      changeBook && selectedBook && selectedBook.id !== currentBook?.id
        ? selectedBook
        : null;

    const result = await updateMeeting(
      meetingId,
      {
        meetingDate: fromDateTimeInput(meetingDate) ?? "",
        nominationDeadline: fromDateTimeInput(nominationDeadline),
        votingDeadline: fromDateTimeInput(votingDeadline),
        themeName,
        details,
      },
      newBook
    );

    if (!result.success) {
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

    if (!result.success) {
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
          <EditMeetingDetailsStep
            bookClubId={bookClubId}
            values={values}
            onValueChange={handleValueChange}
            currentBook={currentBook}
            changeBook={changeBook}
            onChangeBookToggle={setChangeBook}
            error={error}
            isSubmitting={isSubmitting}
            onDelete={handleDelete}
            onCancel={() => setOpen(false)}
            onNext={() => setStep("book")}
            onSave={handleSubmit}
          />
        )}

        {step === "book" && (
          <EditMeetingBookStep
            meetingDate={meetingDate}
            themeName={themeName}
            selectedBook={selectedBook}
            onSelectBook={setSelectedBook}
            error={error}
            isSubmitting={isSubmitting}
            onBack={() => setStep("details")}
            onSave={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
