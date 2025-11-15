"use client";

import { useState, useEffect } from "react";
import { createInviteLink, deactivateInviteLink } from "@/app/actions/invites";
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
import { UserPlusIcon, CopyIcon, CheckIcon, XIcon } from "lucide-react";

interface InviteLinkDialogProps {
  bookClubId: string;
  bookClubName: string;
}

export function InviteLinkDialog({
  bookClubId,
  bookClubName,
}: InviteLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteUrl =
    typeof window !== "undefined" && inviteCode
      ? `${window.location.origin}/join/${inviteCode}`
      : "";

  async function handleCreateLink() {
    setIsLoading(true);
    setError(null);

    const result = await createInviteLink(bookClubId);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else if (result.code) {
      setInviteCode(result.code);
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDeactivate() {
    if (!inviteCode) return;

    setIsLoading(true);
    const result = await deactivateInviteLink(bookClubId, inviteCode);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setInviteCode(null);
      setIsLoading(false);
    }
  }

  // Load existing invite link when dialog opens
  useEffect(() => {
    if (open && !inviteCode) {
      handleCreateLink();
    }
  }, [open]);

  function resetDialog() {
    setInviteCode(null);
    setError(null);
    setCopied(false);
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
        <Button variant="outline">
          <UserPlusIcon className="h-4 w-4 mr-2" />
          Invite Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Members to {bookClubName}</DialogTitle>
          <DialogDescription>
            Share this link with people you want to invite. Anyone with the link
            can join the book club.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && !inviteCode ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-600">Generating invite link...</p>
            </div>
          ) : inviteCode ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Invite Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-700">Copied to clipboard!</p>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  This link never expires and can be used multiple times. You can
                  deactivate it at any time.
                </p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="outline"
                  onClick={handleDeactivate}
                  disabled={isLoading}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Deactivate Link
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </>
          ) : null}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
