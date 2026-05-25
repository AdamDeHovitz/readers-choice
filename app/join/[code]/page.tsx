import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInviteLinkDetails, checkMembership } from "@/app/actions/invites";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JoinBookClubButton } from "@/components/book-clubs/join-book-club-button";
import Link from "next/link";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  const { code } = await params;

  // Get invite link details
  const inviteDetails = await getInviteLinkDetails(code);

  // If link is invalid, show error
  if (!inviteDetails) {
    return (
      <div className="bg-cream-100 flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-700">Invalid Invite Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-dark-600 mb-4">
              This invite link is invalid, expired, or has been deactivated.
            </p>
            {session?.user ? (
              <Link
                href="/dashboard"
                className="text-gold-700 hover:text-dark-900 font-inria font-medium"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <Link
                href="/"
                className="text-gold-700 hover:text-dark-900 font-inria font-medium"
              >
                Go to Home →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not logged in, redirect to login with callback
  if (!session?.user) {
    redirect(`/login?callbackUrl=/join/${code}`);
  }

  // Check if user is already a member
  const isMember = await checkMembership(
    inviteDetails.bookClubId,
    session.user.id!
  );
  if (isMember) {
    // User is already a member, redirect to the book club
    redirect(`/book-clubs/${inviteDetails.bookClubId}`);
  }

  return (
    <div className="bg-cream-100 min-h-screen">
      <nav className="border-gold-600/20 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/dashboard"
              className="font-inria text-dark-900 hover:text-gold-700 text-xl font-bold transition-colors"
            >
              Readers&apos; Choice
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-dark-600 text-sm">{session.user.name}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-inria text-dark-900 text-2xl font-bold">
              Join {inviteDetails.bookClubName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {inviteDetails.bookClubDescription && (
              <div>
                <h3 className="font-inria text-dark-900 mb-2 font-medium">
                  About
                </h3>
                <p className="text-dark-600">
                  {inviteDetails.bookClubDescription}
                </p>
              </div>
            )}

            <div className="bg-gold-50 border-gold-600 rounded-lg border p-4">
              <p className="text-dark-900 text-sm">
                You&apos;ve been invited to join this book club. Click the
                button below to become a member and start participating in
                discussions and votes.
              </p>
            </div>

            <JoinBookClubButton
              code={code}
              bookClubName={inviteDetails.bookClubName}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
