"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBookClub } from "@/app/actions/book-clubs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2Icon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useId } from "react";

interface DeleteBookClubDialogProps {
  bookClubId: string;
  bookClubName: string;
}

export function DeleteBookClubDialog({
  bookClubId,
  bookClubName,
}: DeleteBookClubDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationName, setConfirmationName] = useState("");
  const confirmationId = useId();

  async function handleDelete() {
    if (isDeleting || confirmationName !== bookClubName) return;
    setIsDeleting(true);
    setError(null);

    const result = await deleteBookClub(bookClubId, confirmationName);

    if (!result.success) {
      setError(result.error);
      setIsDeleting(false);
    } else {
      setOpen(false);
      setIsDeleting(false);
      router.push("/browse");
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isDeleting) return;
        setOpen(nextOpen);
        setConfirmationName("");
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          aria-label={`Delete ${bookClubName}`}
          className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50 hover:text-red-800"
        >
          <Trash2Icon className="mr-2 h-4 w-4" />
          Delete Book Club
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-red-700">Delete Book Club</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <strong className="text-dark-900">{bookClubName}</strong>? This
            action cannot be undone and will permanently delete:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <ul className="text-dark-600 ml-2 list-inside list-disc space-y-1 text-sm">
            <li>All meetings and their voting data</li>
            <li>All themes and their votes</li>
            <li>All personal rankings</li>
            <li>All member associations</li>
            <li>All invite links</li>
          </ul>
          <p className="text-dark-600 text-sm">
            User accounts and shared books will be kept.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={confirmationId}>Type {bookClubName} to confirm</Label>
          <Input
            id={confirmationId}
            value={confirmationName}
            onChange={(event) => setConfirmationName(event.target.value)}
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting || confirmationName !== bookClubName}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Book Club"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
