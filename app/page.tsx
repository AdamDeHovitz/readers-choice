import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-cream-50 to-cream-100">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-voga uppercase text-dark-900 tracking-wide">
          READERS&apos; CHOICE
        </h1>
        <p className="text-xl font-inria font-bold font-inria text-dark-900">
          Your joyful book club community
        </p>
        <p className="text-base font-inria text-dark-600">
          Create book clubs, vote on your next read, and rank your favorites
          with friends
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          {session ? (
            <>
              <Link href="/dashboard">
                <Button size="lg" variant="default">
                  My Book Clubs
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="lg" variant="secondary">
                  Browse Book Clubs
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="lg" variant="default">
                  Get Started
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="lg" variant="secondary">
                  Browse Book Clubs
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
