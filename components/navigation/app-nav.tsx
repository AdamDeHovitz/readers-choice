import Link from "next/link";
import { SettingsIcon } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

/** Top bar for pages outside a club (dashboard, settings). */
export function AppNav({ userName }: { userName: string }) {
  return (
    <nav className="bg-gold-600 border-gold-700 sticky top-0 z-50 border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="font-inria text-dark-900 hover:text-dark-600 text-xl font-bold transition-colors"
          >
            Readers&apos; Choice
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <span className="font-inria text-dark-900 hidden text-sm sm:inline">
              {userName}
            </span>
            <SettingsLink />
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

export function SettingsLink({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/settings"
      onClick={onClick}
      aria-label="Settings"
      title="Settings"
      className="text-dark-900 hover:bg-dark-900/5 rounded-md p-2 transition-colors"
    >
      <SettingsIcon className="size-5" aria-hidden />
    </Link>
  );
}
