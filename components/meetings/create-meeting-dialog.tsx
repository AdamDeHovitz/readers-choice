"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMeeting } from "@/app/actions/meetings";
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

interface CreateMeetingDialogProps {
  bookClubId: string;
}

export function CreateMeetingDialog({ bookClubId }: CreateMeetingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("bookClubId", bookClubId);
    formData.append("themeName", themeName);

    const result = await createMeeting(formData);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setOpen(false);
      setThemeName("");
      setIsSubmitting(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Schedule Meeting</Button>
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
            <DateTimePicker
              id="meetingDate"
              name="meetingDate"
              required
              disabled={isSubmitting}
            />
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
            <Label htmlFor="details">Details (Optional)</Label>
            <Textarea
              id="details"
              name="details"
              placeholder="e.g., Read the first half only, specific chapters to discuss..."
              disabled={isSubmitting}
              rows={3}
            />
            <p className="text-dark-500 text-xs">
              Add any additional details or instructions for this meeting
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nominationDeadline">
              Nomination Deadline (Optional)
            </Label>
            <DateTimePicker
              id="nominationDeadline"
              name="nominationDeadline"
              disabled={isSubmitting}
            />
            <p className="text-dark-500 text-xs">
              When should nominations close? After this, members can only vote.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="votingDeadline">Voting Deadline (Optional)</Label>
            <DateTimePicker
              id="votingDeadline"
              name="votingDeadline"
              disabled={isSubmitting}
            />
            <p className="text-dark-500 text-xs">
              When should voting close? Usually set to meeting time.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Meeting"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
