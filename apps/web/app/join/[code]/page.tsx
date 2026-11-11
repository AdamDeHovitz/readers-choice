import { redirect } from "next/navigation";
import { isMember } from "@/server/authz";
import { createAdminClient } from "@/server/db";
import { getInviteDetails } from "@/server/invites";
import { getViewer } from "@/server/viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JoinBookClubButton } from "@/components/book-clubs/join-book-club-button";
import Link from "next/link";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [viewer, { code }] = await Promise.all([getViewer(), params]);
  const inviteDetails = await getInviteDetails(
    viewer?.db ?? createAdminClient(),
    code
  );

  // If link is invalid, show error
  if (!inviteDetails) {
    return (
      <main className="pt-safe pb-safe flex min-h-dvh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              <h1>Invalid invite link</h1>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This invite link is invalid, expired, or has been deactivated.
            </p>
            {viewer ? (
              <Link href="/dashboard" className="text-primary font-bold">
                Go to Dashboard →
              </Link>
            ) : (
              <Link href="/" className="text-primary font-bold">
                Go to Home →
              </Link>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  // If not logged in, redirect to login with callback
  if (!viewer) {
    redirect(`/login?callbackUrl=/join/${encodeURIComponent(code)}`);
  }

  if (await isMember(viewer.db, inviteDetails.bookClubId, viewer.userId)) {
    // User is already a member, redirect to the book club
    redirect(`/book-clubs/${inviteDetails.bookClubId}`);
  }

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="bg-card border-border space-y-6 rounded-3xl border p-6 shadow-sm sm:p-8">
        <div className="space-y-2">
          <p className="text-primary text-sm font-bold tracking-widest uppercase">
            You&apos;re invited
          </p>
          <h1 className="font-display text-foreground text-3xl leading-tight">
            Join {inviteDetails.bookClubName}
          </h1>
          {inviteDetails.bookClubDescription && (
            <p className="text-muted-foreground">
              {inviteDetails.bookClubDescription}
            </p>
          )}
        </div>

        <p className="text-dark-700 text-sm">
          Become a member to nominate books, vote on what the club reads next,
          and rank your favorites.
        </p>

        <JoinBookClubButton
          code={code}
          bookClubName={inviteDetails.bookClubName}
        />

        <p className="text-muted-foreground text-center text-xs">
          Signed in as {viewer.name}.{" "}
          <Link href="/dashboard" className="text-primary font-bold">
            Not now
          </Link>
        </p>
      </div>
    </main>
  );
}
