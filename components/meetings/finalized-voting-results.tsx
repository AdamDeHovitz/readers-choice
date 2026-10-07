"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import {
  calculateMeetingResults,
  type VotingResults,
} from "@/app/actions/meeting-voting";
import { VotingResultsDisplay } from "./voting-results";

/**
 * Collapsible voting results for a finalized meeting. Results are computed
 * from the stored ballots the first time the section is opened.
 */
export function FinalizedVotingResults({ meetingId }: { meetingId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<VotingResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const opening = !isOpen;
    setIsOpen(opening);
    if (!opening || results || isLoading) return;

    setIsLoading(true);
    setError(null);
    const loaded = await calculateMeetingResults(meetingId);
    setIsLoading(false);
    if (loaded) {
      setResults(loaded);
    } else {
      setError("Couldn't load voting results.");
    }
  }

  return (
    <div className="border-gold-600/20 border-t pt-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="text-gold-700 hover:text-gold-800 flex items-center gap-2 text-sm font-medium"
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        {isOpen ? "Hide voting results" : "See voting results"}
      </button>

      {isOpen && (
        <div className="mt-3">
          {isLoading && (
            <p className="text-dark-500 py-4 text-center text-sm">
              Calculating results...
            </p>
          )}
          {error && <Alert variant="destructive">{error}</Alert>}
          {results && (
            <VotingResultsDisplay results={results} winnerLabel="Vote winner" />
          )}
        </div>
      )}
    </div>
  );
}
