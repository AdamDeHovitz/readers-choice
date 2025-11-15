import { auth } from "@/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold text-slate-900">
          Readers&apos; Choice
        </h1>
        <p className="text-xl text-slate-600">
          Your joyful book club community
        </p>
        <p className="text-slate-500">
          Create book clubs, vote on your next read, and rank your favorites
          with friends
        </p>
        <div className="pt-4">
          {session ? (
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-block px-8 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
