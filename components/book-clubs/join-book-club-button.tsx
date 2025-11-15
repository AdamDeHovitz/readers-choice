"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinBookClubViaInvite } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";

interface JoinBookClubButtonProps {
  code: string;
  bookClubName: string;
}

export function JoinBookClubButton({
  code,
  bookClubName,
}: JoinBookClubButtonProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setIsJoining(true);
    setError(null);

    const result = await joinBookClubViaInvite(code);

    if (result.error) {
      setError(result.error);
      setIsJoining(false);
    } else if (result.bookClubId) {
      // Redirect to the book club page
      router.push(`/book-clubs/${result.bookClubId}`);
    }
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleJoin}
        disabled={isJoining}
        className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold"
        size="lg"
      >
        {isJoining ? "Joining..." : `Join ${bookClubName}`}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
