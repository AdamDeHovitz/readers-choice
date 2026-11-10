"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinBookClubViaInvite } from "@/app/actions/invites";
import { useAction } from "@/hooks/use-action";

interface JoinBookClubButtonProps {
  code: string;
  bookClubName: string;
}

export function JoinBookClubButton({
  code,
  bookClubName,
}: JoinBookClubButtonProps) {
  const router = useRouter();
  const { run: join, pending: isJoining } = useAction(joinBookClubViaInvite, {
    refresh: false,
    onSuccess: ({ bookClubId }) => router.push(`/book-clubs/${bookClubId}`),
  });

  async function handleJoin() {
    const result = await join(code);
    if (!result.success) alert(result.error);
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
