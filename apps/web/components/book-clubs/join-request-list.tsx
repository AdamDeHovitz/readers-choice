"use client";

import { useState } from "react";
import Image from "next/image";
import {
  approveJoinRequest,
  declineJoinRequest,
} from "@/app/actions/book-clubs";
import { useAction } from "@/hooks/use-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LocalDate } from "@/components/ui/local-date";
import type { PendingJoinRequest } from "@/server/join-requests";

interface JoinRequestListProps {
  bookClubId: string;
  requests: PendingJoinRequest[];
}

/** Pending requests to join, for admins to approve or decline. */
export function JoinRequestList({
  bookClubId,
  requests,
}: JoinRequestListProps) {
  const [actingOn, setActingOn] = useState<string | null>(null);
  const approve = useAction(approveJoinRequest);
  const decline = useAction(declineJoinRequest);
  const busy = approve.pending || decline.pending;
  const error = approve.error ?? decline.error;

  function act(action: typeof approve, other: typeof decline, userId: string) {
    setActingOn(userId);
    other.reset();
    action.run({ bookClubId, userId });
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <ul className="bg-card border-border divide-border divide-y overflow-hidden rounded-2xl border shadow-xs">
        {requests.map((request) => {
          const acting = busy && actingOn === request.userId;
          return (
            <li key={request.userId} className="flex gap-3 p-3 sm:p-4">
              {request.avatarUrl ? (
                <Image
                  src={request.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-full"
                />
              ) : (
                <div
                  aria-hidden
                  className="bg-sage-200 text-sage-800 font-inria flex size-10 shrink-0 items-center justify-center rounded-full font-medium"
                >
                  {request.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-inria text-foreground truncate font-bold">
                  {request.name}
                </p>
                <p className="text-dark-500 text-xs">
                  Asked <LocalDate iso={request.requestedAt} format="date" />
                </p>
                {request.message && (
                  <p className="text-foreground text-sm break-words whitespace-pre-line">
                    {request.message}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => act(approve, decline, request.userId)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={acting}
                    onClick={() => act(decline, approve, request.userId)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
