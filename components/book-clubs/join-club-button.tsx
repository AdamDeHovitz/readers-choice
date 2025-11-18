"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinBookClub } from "@/app/actions/book-clubs";

interface JoinBookClubButtonProps {
  bookClubId: string;
}

export function JoinClubButton({ bookClubId }: JoinBookClubButtonProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);

  async function handleJoin() {
    setIsJoining(true);

    const result = await joinBookClub(bookClubId);

    if (result.error) {
      alert(result.error);
      setIsJoining(false);
    } else {
      // Success - refresh the page to show member view
      router.refresh();
    }
  }

  return (
    <Button onClick={handleJoin} disabled={isJoining} size="lg">
      {isJoining ? "Joining..." : "Join Book Club"}
    </Button>
  );
}
