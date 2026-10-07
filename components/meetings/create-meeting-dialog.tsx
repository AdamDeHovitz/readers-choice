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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeCombobox } from "@/components/themes/theme-combobox";
import { Alert } from "@/components/ui/alert";

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
            <Input
              id="meetingDate"
              name="meetingDate"
              type="datetime-local"
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
            <Input
              id="nominationDeadline"
              name="nominationDeadline"
              type="datetime-local"
              disabled={isSubmitting}
            />
            <p className="text-dark-500 text-xs">
              When should nominations close? After this, members can only vote.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="votingDeadline">Voting Deadline (Optional)</Label>
            <Input
              id="votingDeadline"
              name="votingDeadline"
              type="datetime-local"
              disabled={isSubmitting}
            />
            <p className="text-dark-500 text-xs">
              When should voting close? Usually set to meeting time.
            </p>
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

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
