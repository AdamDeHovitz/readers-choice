"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setVotingMethod } from "@/app/actions/meeting-voting";

interface VotingMethodToggleProps {
  meetingId: string;
  currentMethod: "approval" | "ranked" | null;
  disabled?: boolean;
  hasExistingVotes: boolean;
}

export function VotingMethodToggle({
  meetingId,
  currentMethod,
  disabled = false,
  hasExistingVotes,
}: VotingMethodToggleProps) {
  const [isRanked, setIsRanked] = useState(currentMethod === "ranked");
  const [isSwitching, setIsSwitching] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<
    "approval" | "ranked" | null
  >(null);

  async function handleToggle(checked: boolean) {
    const newMethod = checked ? "ranked" : "approval";

    // If user has existing votes, show confirmation
    if (hasExistingVotes && currentMethod && currentMethod !== newMethod) {
      setPendingMethod(newMethod);
      setShowConfirm(true);
      return;
    }

    await performSwitch(newMethod);
  }

  async function performSwitch(method: "approval" | "ranked") {
    setIsSwitching(true);
    setShowConfirm(false);

    const result = await setVotingMethod(meetingId, method);

    if (result.success) {
      setIsRanked(method === "ranked");
      // Force a page refresh to update the voting UI
      window.location.reload();
    } else {
      // Revert on error
      setIsRanked(currentMethod === "ranked");
    }

    setIsSwitching(false);
    setPendingMethod(null);
  }

  function handleCancel() {
    setShowConfirm(false);
    setPendingMethod(null);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Switch
          id="voting-method"
          checked={isRanked}
          onCheckedChange={handleToggle}
          disabled={disabled || isSwitching}
        />
        <Label
          htmlFor="voting-method"
          className={`cursor-pointer text-sm ${disabled ? "text-dark-400" : "text-dark-700"}`}
        >
          {isSwitching ? "Switching..." : "Ranked Choice"}
        </Label>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="absolute top-full right-0 z-50 mt-2">
          <div className="border-gold-600/20 w-72 rounded-lg border bg-white p-4 shadow-lg">
            <p className="text-dark-700 mb-3 text-sm">
              Switch to{" "}
              {pendingMethod === "ranked" ? "ranked choice" : "approval"}{" "}
              voting? Your current votes will be cleared.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="text-dark-600 hover:text-dark-800 px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => pendingMethod && performSwitch(pendingMethod)}
                className="bg-rust-700 text-cream-100 hover:bg-rust-800 rounded px-3 py-1.5 text-sm"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {disabled && (
        <p className="text-dark-400 mt-1 text-xs">Voting has closed</p>
      )}
    </div>
  );
}
