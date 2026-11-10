"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinBookClubViaInvite } from "@/app/actions/invites";

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

  async function handleJoin() {
    setIsJoining(true);

    const result = await joinBookClubViaInvite(code);

    if (!result.success) {
      alert(result.error);
      setIsJoining(false);
    } else {
      router.push(`/book-clubs/${result.data.bookClubId}`);
    }
  }

  return (
    <Button
      onClick={handleJoin}
      disabled={isJoining}
      size="lg"
      className="w-full sm:w-auto"
    >
      {isJoining ? "Joining..." : `Join ${bookClubName}`}
    </Button>
  );
}
