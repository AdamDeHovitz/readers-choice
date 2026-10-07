import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeCombobox } from "@/components/themes/theme-combobox";

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
  onDelete: () => void;
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
  onDelete,
  onCancel,
  onNext,
  onSave,
}: EditMeetingDetailsStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="editMeetingDate">Meeting Date & Time</Label>
        <Input
          id="editMeetingDate"
          type="datetime-local"
          value={values.meetingDate}
          onChange={(e) => onValueChange("meetingDate", e.target.value)}
          required
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
        <Input
          id="editNominationDeadline"
          type="datetime-local"
          value={values.nominationDeadline}
          onChange={(e) => onValueChange("nominationDeadline", e.target.value)}
        />
        <p className="text-dark-500 text-xs">
          When should nominations close? After this, members can only vote.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editVotingDeadline">Voting Deadline (Optional)</Label>
        <Input
          id="editVotingDeadline"
          type="datetime-local"
          value={values.votingDeadline}
          onChange={(e) => onValueChange("votingDeadline", e.target.value)}
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

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="destructive"
          onClick={onDelete}
          disabled={isSubmitting}
        >
          Delete Meeting
        </Button>
        <div className="flex gap-2">
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
            <Button onClick={onSave} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
