"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="px-4 py-2 text-sm font-medium font-inria text-dark-600 hover:text-dark-900 hover:bg-cream-200 rounded-lg transition-colors"
    >
      Sign Out
    </button>
  );
}
