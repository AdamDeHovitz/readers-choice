"use client";

import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { joinBookClubViaInvite } from "@/app/actions/invites";
import { useAction } from "@/hooks/use-action";

interface JoinBookClubButtonProps {
  code: string;
  bookClubName: string;
}

/** Joins through an invite link: no approval needed, whatever the club's policy. */
export function JoinBookClubButton({
  code,
  bookClubName,
}: JoinBookClubButtonProps) {
  const router = useRouter();
  const { run, pending, error } = useAction(joinBookClubViaInvite, {
    refresh: false,
    onSuccess: ({ bookClubId }) => router.push(`/book-clubs/${bookClubId}`),
  });

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button
        onClick={() => run({ code })}
        disabled={pending}
        size="lg"
        className="w-full"
      >
        {pending ? "Joining..." : `Join ${bookClubName}`}
      </Button>
    </div>
  );
}
