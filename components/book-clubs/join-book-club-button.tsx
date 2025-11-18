"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinBookClubViaInvite } from "@/app/actions/invites";

interface JoinBookClubButtonProps {
  code: string;
  bookClubName: string;
}

export function JoinBookClubButton({ code, bookClubName }: JoinBookClubButtonProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);

  async function handleJoin() {
    setIsJoining(true);

    const result = await joinBookClubViaInvite(code);

    if (result.error) {
      alert(result.error);
      setIsJoining(false);
    } else if (result.bookClubId) {
      // Success - redirect to the book club
      router.push(`/book-clubs/${result.bookClubId}`);
    }
  }

  return (
    <Button onClick={handleJoin} disabled={isJoining} size="lg" className="w-full sm:w-auto">
      {isJoining ? "Joining..." : `Join ${bookClubName}`}
    </Button>
  );
}
