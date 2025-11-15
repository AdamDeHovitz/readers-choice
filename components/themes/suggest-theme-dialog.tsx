"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { suggestTheme } from "@/app/actions/themes";
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

interface SuggestThemeDialogProps {
  bookClubId: string;
}

export function SuggestThemeDialog({ bookClubId }: SuggestThemeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetDialog() {
    setThemeName("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!themeName.trim()) return;

    setError(null);
    setIsSubmitting(true);

    const result = await suggestTheme(bookClubId, themeName);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setOpen(false);
      resetDialog();
      setIsSubmitting(false);
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button>Suggest Theme</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Suggest a Theme</DialogTitle>
          <DialogDescription>
            Propose a new theme for upcoming book club meetings. Other members
            can upvote themes they like.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="themeName">Theme Name</Label>
            <Input
              id="themeName"
              type="text"
              placeholder="e.g., Science Fiction, Historical Fiction, Mystery..."
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              required
            />
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
            <Button type="submit" disabled={!themeName.trim() || isSubmitting}>
              {isSubmitting ? "Suggesting..." : "Suggest Theme"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
