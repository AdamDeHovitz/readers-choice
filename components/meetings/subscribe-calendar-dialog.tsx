"use client";

import { useState } from "react";
import { CalendarPlusIcon, CheckIcon, CopyIcon } from "lucide-react";
import {
  getCalendarFeedToken,
  resetCalendarFeedToken,
} from "@/app/actions/calendar";
import { useAction } from "@/hooks/use-action";
import { calendarSubscribeLinks } from "@/lib/club-calendar";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SubscribeCalendarDialogProps {
  bookClubId: string;
  bookClubName: string;
}

/** Subscribe to the club's meetings in Google, Apple or Outlook calendars. */
export function SubscribeCalendarDialog({
  bookClubId,
  bookClubName,
}: SubscribeCalendarDialogProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const load = useAction(getCalendarFeedToken, {
    refresh: false,
    onSuccess: ({ token }) => setToken(token),
  });
  const reset = useAction(resetCalendarFeedToken, {
    refresh: false,
    onSuccess: ({ token }) => {
      setToken(token);
      setConfirmingReset(false);
    },
  });
  const error = load.error ?? reset.error;

  const feedUrl =
    typeof window !== "undefined" && token
      ? `${window.location.origin}/api/calendar/${token}.ics`
      : "";
  const links = feedUrl ? calendarSubscribeLinks(feedUrl) : null;

  async function handleCopy() {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      load.run(bookClubId);
    } else {
      setToken(null);
      setCopied(false);
      setConfirmingReset(false);
      load.reset();
      reset.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarPlusIcon aria-hidden />
          Add to calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subscribe to {bookClubName}</DialogTitle>
          <DialogDescription>
            Add the club&apos;s meetings to your calendar. New meetings and
            changes show up automatically.
          </DialogDescription>
        </DialogHeader>

        {load.pending && !token ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Loading your calendar link…
          </p>
        ) : links ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button asChild>
                <a href={links.google} target="_blank" rel="noreferrer">
                  Add to Google Calendar
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={links.webcal}>Add to Apple or Outlook calendar</a>
              </Button>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="calendar-feed-url"
                className="text-muted-foreground text-sm font-bold"
              >
                Or copy the link into any calendar app
              </label>
              <div className="flex gap-2">
                <Input
                  id="calendar-feed-url"
                  value={feedUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy calendar link"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              </div>
              {copied && (
                <p className="text-rust-700 text-sm">Copied to clipboard!</p>
              )}
            </div>

            <Alert>
              Google Calendar checks for changes every few hours, so updates can
              take up to a day to appear there. This link is just for you:
              don&apos;t share it.
            </Alert>

            {confirmingReset ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Calendars using your current link will stop updating, and
                  you&apos;ll need to subscribe again.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => reset.run(bookClubId)}
                    disabled={reset.pending}
                  >
                    Reset link
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmingReset(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="link"
                className="h-auto px-0"
                onClick={() => setConfirmingReset(true)}
              >
                Reset my calendar link
              </Button>
            )}
          </div>
        ) : null}

        {error && <Alert variant="destructive">{error}</Alert>}
      </DialogContent>
    </Dialog>
  );
}
