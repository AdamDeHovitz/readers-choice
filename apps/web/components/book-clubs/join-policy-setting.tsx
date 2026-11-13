"use client";

import { CheckIcon } from "lucide-react";
import {
  JOIN_POLICIES,
  type JoinPolicy,
} from "@readers-choice/core/join-policy";
import { setJoinPolicy } from "@/app/actions/book-clubs";
import { useAction } from "@/hooks/use-action";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { JOIN_POLICY_COPY } from "./join-policy-copy";

interface JoinPolicySettingProps {
  bookClubId: string;
  joinPolicy: JoinPolicy;
  pendingRequestCount: number;
}

/** Admins choose who can join: one tap per option, saved straight away. */
export function JoinPolicySetting({
  bookClubId,
  joinPolicy,
  pendingRequestCount,
}: JoinPolicySettingProps) {
  const { run, pending, error } = useAction(setJoinPolicy);

  function choose(policy: JoinPolicy) {
    if (policy === joinPolicy || pending) return;
    run({ bookClubId, policy });
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <ul
        role="radiogroup"
        aria-label="Who can join"
        className="bg-card border-border divide-border divide-y overflow-hidden rounded-2xl border shadow-xs"
      >
        {JOIN_POLICIES.map((policy) => {
          const selected = policy === joinPolicy;
          return (
            <li key={policy}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={pending}
                onClick={() => choose(policy)}
                className="active:bg-muted flex min-h-11 w-full items-center gap-3 p-3 text-left disabled:opacity-60 sm:p-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-inria text-foreground block font-bold">
                    {JOIN_POLICY_COPY[policy].label}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {JOIN_POLICY_COPY[policy].description}
                  </span>
                  {policy === "open" &&
                    !selected &&
                    pendingRequestCount > 0 && (
                      <span className="text-dark-500 mt-1 block text-xs">
                        Also lets in the {pendingRequestCount}{" "}
                        {pendingRequestCount === 1 ? "person" : "people"}{" "}
                        waiting on a request.
                      </span>
                    )}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                    selected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-dark-900/20"
                  )}
                >
                  {selected && <CheckIcon className="size-4" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
