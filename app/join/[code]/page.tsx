import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getInviteLinkDetails,
  joinBookClubViaInvite,
  checkMembership,
} from "@/app/actions/invites";
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
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
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
                className="text-gold-700 hover:text-dark-900 font-medium font-inria"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <Link
                href="/"
                className="text-gold-700 hover:text-dark-900 font-medium font-inria"
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
  const isMember = await checkMembership(inviteDetails.bookClubId, session.user.id!);
  if (isMember) {
    // User is already a member, redirect to the book club
    redirect(`/book-clubs/${inviteDetails.bookClubId}`);
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <nav className="bg-white border-b border-gold-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-xl font-bold font-inria text-dark-900 hover:text-gold-700 transition-colors">
              Readers&apos; Choice
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-dark-600">{session.user.name}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-inria text-dark-900">
              Join {inviteDetails.bookClubName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {inviteDetails.bookClubDescription && (
              <div>
                <h3 className="font-medium font-inria text-dark-900 mb-2">About</h3>
                <p className="text-dark-600">
                  {inviteDetails.bookClubDescription}
                </p>
              </div>
            )}

            <div className="p-4 bg-gold-50 border border-gold-600 rounded-lg">
              <p className="text-sm text-dark-900">
                You&apos;ve been invited to join this book club. Click the button
                below to become a member and start participating in discussions
                and votes.
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
