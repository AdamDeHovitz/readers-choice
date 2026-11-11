"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setVotingMethod } from "@/app/actions/meeting-voting";
import { useAction } from "@/hooks/use-action";

interface VotingMethodToggleProps {
  meetingId: string;
  currentMethod: "approval" | "ranked" | null;
  disabled?: boolean;
}

/**
 * Switches the reader's ballot between approval and ranked choice. Switching
 * clears votes cast the other way (server/voting.ts), immediately and
 * without a confirmation step.
 */
export function VotingMethodToggle({
  meetingId,
  currentMethod,
  disabled = false,
}: VotingMethodToggleProps) {
  const [isRanked, setIsRanked] = useState(currentMethod === "ranked");
  // Refreshing swaps in the ballot UI for the new method.
  const {
    run: switchMethod,
    pending: isSwitching,
    error,
  } = useAction(setVotingMethod, {
    onSuccess: (_, _meetingId, method) => setIsRanked(method === "ranked"),
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <Switch
          id="voting-method"
          checked={isRanked}
          onCheckedChange={(checked) =>
            switchMethod(meetingId, checked ? "ranked" : "approval")
          }
          disabled={disabled || isSwitching}
        />
        <Label
          htmlFor="voting-method"
          className={`cursor-pointer text-sm ${disabled ? "text-dark-500" : "text-dark-700"}`}
        >
          {isSwitching ? "Switching…" : "Ranked Choice"}
        </Label>
      </div>

      {error && (
        <p role="alert" className="text-destructive mt-1 text-xs">
          {error}
        </p>
      )}
      {disabled && (
        <p className="text-dark-500 mt-1 text-xs">Voting has closed</p>
      )}
    </div>
  );
}
