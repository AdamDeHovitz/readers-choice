"use client";

import { useState } from "react";
import { suggestTheme } from "@/app/actions/themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { useAction } from "@/hooks/use-action";

interface SuggestThemeDialogProps {
  bookClubId: string;
}

export function SuggestThemeDialog({ bookClubId }: SuggestThemeDialogProps) {
  const [open, setOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  const {
    run: suggest,
    pending: isSubmitting,
    error,
    reset,
  } = useAction(suggestTheme, {
    onSuccess: () => {
      setOpen(false);
      resetDialog();
    },
  });

  function resetDialog() {
    setThemeName("");
    reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!themeName.trim()) return;
    suggest({ bookClubId, name: themeName });
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
        <Button>
          <PlusIcon aria-hidden />
          Suggest a theme
        </Button>
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
            <Button type="submit" disabled={!themeName.trim() || isSubmitting}>
              {isSubmitting ? "Suggesting..." : "Suggest Theme"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
