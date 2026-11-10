"use client";

import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMeeting } from "@/app/actions/meetings";
import { useAction } from "@/hooks/use-action";

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
  const { run: remove, pending: isDeleting } = useAction(deleteMeeting, {
    refresh: false,
    onSuccess: () => router.push(`/book-clubs/${bookClubId}`),
  });

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete "${meetingName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    const result = await remove(meetingId);
    if (!result.success) alert(`Error: ${result.error}`);
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="!text-red-600 hover:!bg-red-50 hover:!text-red-700"
      title="Delete meeting"
    >
      <Trash2Icon className="h-4 w-4" />
    </Button>
  );
}
