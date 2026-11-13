"use client";

import { useState } from "react";
import { createMeeting } from "@/app/actions/meetings";
import {
  END_OF_DAY,
  fromDateTimeInput,
} from "@readers-choice/core/datetime-input";
import {
  suggestMeetingSchedule,
  type MeetingScheduleDefaults,
  type PastMeetingSchedule,
} from "@readers-choice/core/meeting-defaults";
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
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeCombobox } from "@/components/themes/theme-combobox";
import { Alert } from "@/components/ui/alert";

interface CreateMeetingDialogProps {
  bookClubId: string;
  /** The club's meetings, newest first, to suggest the next one from. */
  pastMeetings: PastMeetingSchedule[];
}

export function CreateMeetingDialog({
  bookClubId,
  pastMeetings,
}: CreateMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  // Suggested on open, in the browser, so dates are in the user's time zone.
  const [schedule, setSchedule] = useState<MeetingScheduleDefaults | null>(
    null
  );
  const {
    run: create,
    pending: isSubmitting,
    error,
  } = useAction(createMeeting, {
    onSuccess: () => {
      setOpen(false);
      setThemeName("");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!schedule) return;
    const details = String(new FormData(e.currentTarget).get("details") ?? "");

    create(bookClubId, {
      meetingDate: fromDateTimeInput(schedule.meetingDate) ?? "",
      nominationDeadline: fromDateTimeInput(schedule.nominationDeadline),
      votingDeadline: fromDateTimeInput(schedule.votingDeadline),
      themeName,
      details,
    });
  }

  function setScheduleField(
    field: "meetingDate" | "nominationDeadline" | "votingDeadline",
    value: string
  ) {
    setSchedule((prev) => prev && { ...prev, [field]: value });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (newOpen) setSchedule(suggestMeetingSchedule(pastMeetings));
        setOpen(newOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon aria-hidden />
          Schedule meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting for your book club. You can add book options
            and voting after creating the meeting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meetingDate">Meeting Date & Time</Label>
            {schedule && (
              <DateTimeField
                id="meetingDate"
                value={schedule.meetingDate}
                onChange={(value) => setScheduleField("meetingDate", value)}
                defaultTime={schedule.meetingTime}
                disabled={isSubmitting}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="themeName">Theme (Optional)</Label>
            <ThemeCombobox
              bookClubId={bookClubId}
              value={themeName}
              onChange={setThemeName}
              disabled={isSubmitting}
              id="themeName"
            />
            <p className="text-dark-500 text-xs">
              Popular unused themes shown first
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">
              Details & Nomination Guidance (Optional)
            </Label>
            <Textarea
              id="details"
              name="details"
              placeholder="e.g., When you nominate, add a note saying what your personal obsession is and how the book connects to it."
              disabled={isSubmitting}
              rows={3}
            />
            <p className="text-dark-500 text-xs">
              Shown at the top of the meeting page. Use it to tell members what
              to include in their nomination notes, or for reading instructions.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nominationDeadline">
              Nomination Deadline (Optional)
            </Label>
            {schedule && (
              <DateTimeField
                id="nominationDeadline"
                value={schedule.nominationDeadline}
                onChange={(value) =>
                  setScheduleField("nominationDeadline", value)
                }
                defaultTime={END_OF_DAY}
                clearable
                disabled={isSubmitting}
              />
            )}
            <p className="text-dark-500 text-xs">
              When should nominations close? After this, members can only vote.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="votingDeadline">Voting Deadline (Optional)</Label>
            {schedule && (
              <DateTimeField
                id="votingDeadline"
                value={schedule.votingDeadline}
                onChange={(value) => setScheduleField("votingDeadline", value)}
                defaultTime={END_OF_DAY}
                clearable
                disabled={isSubmitting}
              />
            )}
            <p className="text-dark-500 text-xs">
              When should voting close? Usually set to meeting time.
            </p>
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !schedule?.meetingDate}
            >
              {isSubmitting ? "Creating..." : "Create Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
