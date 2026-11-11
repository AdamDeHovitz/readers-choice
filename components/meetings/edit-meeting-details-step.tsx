import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeCombobox } from "@/components/themes/theme-combobox";
import { END_OF_DAY } from "@/lib/datetime-input";
import { DEFAULT_MEETING_TIME } from "@/lib/meeting-defaults";

export interface EditMeetingFormValues {
  meetingDate: string;
  nominationDeadline: string;
  votingDeadline: string;
  themeName: string;
  details: string;
}

interface EditMeetingDetailsStepProps {
  bookClubId: string;
  values: EditMeetingFormValues;
  onValueChange: (field: keyof EditMeetingFormValues, value: string) => void;
  currentBook: { title: string; author: string } | null;
  changeBook: boolean;
  onChangeBookToggle: (changeBook: boolean) => void;
  error: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onNext: () => void;
  onSave: () => void;
}

/** First step of the edit-meeting dialog: date, theme, details and deadlines. */
export function EditMeetingDetailsStep({
  bookClubId,
  values,
  onValueChange,
  currentBook,
  changeBook,
  onChangeBookToggle,
  error,
  isSubmitting,
  onCancel,
  onNext,
  onSave,
}: EditMeetingDetailsStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="editMeetingDate">Meeting Date & Time</Label>
        <DateTimeField
          id="editMeetingDate"
          value={values.meetingDate}
          onChange={(value) => onValueChange("meetingDate", value)}
          defaultTime={DEFAULT_MEETING_TIME}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="editThemeName">Theme (Optional)</Label>
        <ThemeCombobox
          bookClubId={bookClubId}
          value={values.themeName}
          onChange={(value) => onValueChange("themeName", value)}
          id="editThemeName"
        />
        <p className="text-dark-500 text-xs">
          Popular unused themes shown first
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editDetails">
          Details & Nomination Guidance (Optional)
        </Label>
        <Textarea
          id="editDetails"
          placeholder="e.g., When you nominate, add a note saying what your personal obsession is and how the book connects to it."
          value={values.details}
          onChange={(e) => onValueChange("details", e.target.value)}
          rows={3}
        />
        <p className="text-dark-500 text-xs">
          Shown at the top of the meeting page. Use it to tell members what to
          include in their nomination notes, or for reading instructions.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editNominationDeadline">
          Nomination Deadline (Optional)
        </Label>
        <DateTimeField
          id="editNominationDeadline"
          value={values.nominationDeadline}
          onChange={(value) => onValueChange("nominationDeadline", value)}
          defaultTime={END_OF_DAY}
          clearable
        />
        <p className="text-dark-500 text-xs">
          When should nominations close? After this, members can only vote.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editVotingDeadline">Voting Deadline (Optional)</Label>
        <DateTimeField
          id="editVotingDeadline"
          value={values.votingDeadline}
          onChange={(value) => onValueChange("votingDeadline", value)}
          defaultTime={END_OF_DAY}
          clearable
        />
        <p className="text-dark-500 text-xs">
          When should voting close? Usually set to meeting time.
        </p>
      </div>

      {currentBook && (
        <div className="space-y-2">
          <Label>Current Book</Label>
          <div className="bg-cream-100 border-border rounded-lg border p-3">
            <p className="font-inria text-dark-900 text-sm font-medium">
              {currentBook.title}
            </p>
            <p className="text-dark-600 text-sm">by {currentBook.author}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="changeBook"
              checked={changeBook}
              onChange={(e) => onChangeBookToggle(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="changeBook" className="cursor-pointer">
              Change book
            </Label>
          </div>
        </div>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        {changeBook ? (
          <Button onClick={onNext} disabled={!values.meetingDate}>
            Next: Select Book
          </Button>
        ) : (
          <Button
            onClick={onSave}
            disabled={isSubmitting || !values.meetingDate}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
