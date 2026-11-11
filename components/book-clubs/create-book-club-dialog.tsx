"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
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
import { createBookClub } from "@/app/actions/book-clubs";
import { useAction } from "@/hooks/use-action";
import { Alert } from "@/components/ui/alert";

export function CreateBookClubDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    run: create,
    pending: isLoading,
    error,
  } = useAction(createBookClub, {
    onSuccess: ({ bookClubId }) => {
      setOpen(false);
      router.push(`/book-clubs/${bookClubId}`);
    },
  });

  function handleSubmit(formData: FormData) {
    create({
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon aria-hidden />
          New club
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a Book Club</DialogTitle>
            <DialogDescription>
              Start a new book club community. You&apos;ll be the admin and can
              invite others to join.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Book Club Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Sunday Morning Book Club"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell us about your book club..."
                rows={4}
                disabled={isLoading}
              />
            </div>

            {error && <Alert variant="destructive">{error}</Alert>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Book Club"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
