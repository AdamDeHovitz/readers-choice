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

interface CreateMeetingDialogProps {
  bookClubId: string;
}

export function CreateMeetingDialog({ bookClubId }: CreateMeetingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("bookClubId", bookClubId);

    const result = await createMeeting(formData);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setOpen(false);
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
            <Input
              id="themeName"
              name="themeName"
              type="text"
              placeholder="e.g., Science Fiction, Historical Fiction..."
              disabled={isSubmitting}
            />
            <p className="text-xs text-dark-500">
              Choose a theme for this meeting
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
            <p className="text-xs text-dark-500">
              When should voting close? You can finalize manually later.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
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
