"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMeeting } from "@/app/actions/meetings";

interface DeleteMeetingButtonProps {
  meetingId: string;
  bookClubId: string;
  meetingName: string;
}

export function DeleteMeetingButton({
  meetingId,
  bookClubId,
  meetingName,
}: DeleteMeetingButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete "${meetingName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);

    const result = await deleteMeeting(meetingId);

    if (result.error) {
      alert(`Error: ${result.error}`);
      setIsDeleting(false);
    } else {
      router.push(`/book-clubs/${bookClubId}`);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="!text-red-600 hover:!text-red-700 hover:!bg-red-50"
      title="Delete meeting"
    >
      <Trash2Icon className="h-4 w-4" />
    </Button>
  );
}
