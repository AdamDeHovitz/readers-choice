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

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    const result = await deleteBookClub(bookClubId);

    if (result.error) {
      setError(result.error);
      setIsDeleting(false);
    } else {
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400"
        >
          <Trash2Icon className="h-4 w-4 mr-2" />
          Delete Book Club
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-red-700">Delete Book Club</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong className="text-slate-900">{bookClubName}</strong>?
            This action cannot be undone and will permanently delete:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-2">
            <li>All meetings and their voting data</li>
            <li>All themes and their votes</li>
            <li>All personal rankings</li>
            <li>All member associations</li>
          </ul>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

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
            disabled={isDeleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Book Club"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
