"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { getMeetingResults } from "@/app/actions/meeting-voting";
import type { VotingResults } from "@/server/voting";
import { VotingResultsDisplay } from "./voting-results";

interface VotingResultsDropdownProps {
  meetingId: string;
  /** Live: the admin-only tally while voting is open. Otherwise the final one. */
  live?: boolean;
}

/**
 * Collapsible voting results, computed from the stored ballots each time the
 * section is opened so a live tally is never stale.
 */
export function VotingResultsDropdown({
  meetingId,
  live = false,
}: VotingResultsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<VotingResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const opening = !isOpen;
    setIsOpen(opening);
    if (!opening || isLoading) return;

    setResults(null);
    setIsLoading(true);
    setError(null);
    const result = await getMeetingResults(meetingId);
    setIsLoading(false);
    if (result.success && result.data) {
      setResults(result.data);
    } else {
      setError("Couldn't load voting results.");
    }
  }

  const noun = live ? "current results" : "voting results";

  return (
    <div className="border-border border-t pt-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="text-sage-700 hover:text-sage-800 flex items-center gap-2 text-sm font-medium"
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        {isOpen ? `Hide ${noun}` : `See ${noun}`}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {live && (
            <p className="text-muted-foreground text-sm">
              Only admins can see the tally until voting closes.
            </p>
          )}
          {isLoading && (
            <p className="text-dark-500 py-4 text-center text-sm">
              Calculating results...
            </p>
          )}
          {error && <Alert variant="destructive">{error}</Alert>}
          {results && (
            <VotingResultsDisplay
              results={results}
              winnerLabel={live ? "Currently leading" : "Vote winner"}
            />
          )}
        </div>
      )}
    </div>
  );
}
