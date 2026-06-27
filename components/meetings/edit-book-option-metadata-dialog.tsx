"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookOptionMetadata } from "@/app/actions/meetings";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PencilIcon } from "lucide-react";

interface EditBookOptionMetadataDialogProps {
  bookOptionId: string;
  bookTitle: string;
  currentDescription: string | null;
  currentPageCount: number | null;
}

export function EditBookOptionMetadataDialog({
  bookOptionId,
  bookTitle,
  currentDescription,
  currentPageCount,
}: EditBookOptionMetadataDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(currentDescription || "");
  const [pageCount, setPageCount] = useState(
    currentPageCount ? String(currentPageCount) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    const parsedPageCount = pageCount.trim() ? Number(pageCount) : null;
    if (
      parsedPageCount !== null &&
      (!Number.isInteger(parsedPageCount) || parsedPageCount <= 0)
    ) {
      setError("Page count must be a positive whole number");
      setIsSaving(false);
      return;
    }

    const result = await updateBookOptionMetadata(
      bookOptionId,
      description,
      parsedPageCount
    );

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    setOpen(false);
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="shrink-0">
          <PencilIcon className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Book Details</DialogTitle>
          <DialogDescription>
            Update the nomination details for {bookTitle}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={`page-count-${bookOptionId}`}>Page count</Label>
            <Input
              id={`page-count-${bookOptionId}`}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={pageCount}
              onChange={(event) => setPageCount(event.target.value)}
              placeholder="Number of pages"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`description-${bookOptionId}`}>Description</Label>
            <Textarea
              id={`description-${bookOptionId}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a short description for this nomination..."
              rows={8}
              className="resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
