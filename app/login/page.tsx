import { SignInButton } from "@/components/auth/sign-in-button";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold font-inria text-dark-900">
              Readers&apos; Choice
            </h1>
            <p className="text-dark-600">
              Your joyful book club community awaits
            </p>
          </div>

          <div className="pt-4">
            <SignInButton />
          </div>

          <p className="text-center text-sm text-dark-500">
            Sign in to create or join book clubs, vote on books, and rank your
            favorites
          </p>
        </div>
      </div>
    </div>
  );
}
