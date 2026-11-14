"use client";

import { useId, useState } from "react";
import { ClockIcon, MailCheckIcon, UserPlusIcon } from "lucide-react";
import { JOIN_REQUEST_MESSAGE_MAX } from "@readers-choice/core/join-policy";
import { cancelJoinRequest, joinBookClub } from "@/app/actions/book-clubs";
import { useAction } from "@/hooks/use-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { LocalDate } from "@/components/ui/local-date";
import { Textarea } from "@/components/ui/textarea";
import type { ViewerJoinRequest } from "@/server/join-requests";

interface JoinClubPanelProps {
  bookClubId: string;
  bookClubName: string;
  joinPolicy: "request" | "open";
  request: ViewerJoinRequest;
}

/** What a signed-in non-member can do on a listed club's page. */
export function JoinClubPanel({
  bookClubId,
  bookClubName,
  joinPolicy,
  request,
}: JoinClubPanelProps) {
  const join = useAction(joinBookClub);
  const cancel = useAction(cancelJoinRequest);
  const [message, setMessage] = useState("");
  const messageId = useId();
  const error = join.error ?? cancel.error;
  const errorAlert = error && <Alert variant="destructive">{error}</Alert>;

  if (request.status === "pending") {
    return (
      <EmptyState
        icon={<MailCheckIcon />}
        title="Request sent"
        description={`An admin of ${bookClubName} will review it. The club shows up in My clubs once you're in.`}
        action={
          <div className="space-y-3">
            {errorAlert}
            <Button
              variant="outline"
              disabled={cancel.pending}
              onClick={() => {
                join.reset();
                cancel.run({ bookClubId });
              }}
            >
              {cancel.pending ? "Cancelling..." : "Cancel request"}
            </Button>
          </div>
        }
      />
    );
  }

  if (request.status === "cooldown") {
    return (
      <EmptyState
        icon={<ClockIcon />}
        title="You can't ask to join right now"
        description={
          <>
            You can ask again on{" "}
            <LocalDate iso={request.canRequestAgainAt} format="date" />, or join
            any time with an invite link from a member.
          </>
        }
      />
    );
  }

  if (joinPolicy === "open") {
    return (
      <EmptyState
        icon={<UserPlusIcon />}
        title={`Join ${bookClubName}`}
        description="Anyone can join this club. Nominate books, vote on what's next, and rank your favorites."
        action={
          <div className="space-y-3">
            {errorAlert}
            <Button
              disabled={join.pending}
              onClick={() => join.run({ bookClubId })}
            >
              {join.pending ? "Joining..." : "Join club"}
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <form
      className="bg-card border-border space-y-4 rounded-2xl border p-4 shadow-xs sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        cancel.reset();
        join.run({ bookClubId, message });
      }}
    >
      <div className="space-y-1">
        <h2 className="font-inria text-foreground text-lg font-bold">
          Ask to join
        </h2>
        <p className="text-muted-foreground text-sm">
          An admin approves new members of {bookClubName}.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={messageId}>Note to the admins (optional)</Label>
        <Textarea
          id={messageId}
          value={message}
          maxLength={JOIN_REQUEST_MESSAGE_MAX}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Who you are, or how you know the club"
        />
      </div>
      {errorAlert}
      <Button
        type="submit"
        disabled={join.pending}
        className="w-full sm:w-auto"
      >
        {join.pending ? "Sending..." : "Ask to join"}
      </Button>
    </form>
  );
}
