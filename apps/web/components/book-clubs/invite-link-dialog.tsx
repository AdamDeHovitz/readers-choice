"use client";

import { useState } from "react";
import { createInviteLink, deactivateInviteLink } from "@/app/actions/invites";
import { useAction } from "@/hooks/use-action";
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
import { Alert } from "@/components/ui/alert";
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
  const [copied, setCopied] = useState(false);
  const create = useAction(createInviteLink, {
    refresh: false,
    onSuccess: ({ code }) => setInviteCode(code),
  });
  const deactivate = useAction(deactivateInviteLink, {
    refresh: false,
    onSuccess: () => setInviteCode(null),
  });
  const isLoading = create.pending || deactivate.pending;
  const error = create.error ?? deactivate.error;

  const inviteUrl =
    typeof window !== "undefined" && inviteCode
      ? `${window.location.origin}/join/${inviteCode}`
      : "";

  function handleCreateLink() {
    deactivate.reset();
    create.run({ bookClubId });
  }

  async function handleCopy() {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDeactivate() {
    if (!inviteCode) return;
    create.reset();
    deactivate.run({ bookClubId, code: inviteCode });
  }

  function resetDialog() {
    setInviteCode(null);
    create.reset();
    deactivate.reset();
    setCopied(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        // Opening loads the club's existing link (or creates one).
        if (newOpen) handleCreateLink();
        else resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlusIcon aria-hidden />
          Invite members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Members to {bookClubName}</DialogTitle>
          <DialogDescription>
            Share this link with people you want to invite. Anyone with the link
            joins right away, without waiting for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && !inviteCode ? (
            <div className="py-8 text-center">
              <p className="text-dark-600 text-sm">Generating invite link...</p>
            </div>
          ) : inviteCode ? (
            <>
              <div className="space-y-2">
                <label className="font-inria text-dark-600 text-sm font-medium">
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
                  <p className="text-rust-700 text-sm">Copied to clipboard!</p>
                )}
              </div>

              <div className="bg-sage-50 border-sage-600 rounded-lg border p-3">
                <p className="text-dark-900 text-sm">
                  This link never expires and can be used multiple times. You
                  can deactivate it at any time.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={handleDeactivate}
                  disabled={isLoading}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Deactivate Link
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </>
          ) : null}

          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
