"use client";

import { useState } from "react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { RegisterForm } from "@/components/auth/register-form";

type AuthMode = "google" | "credentials" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("google");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="space-y-6 rounded-2xl bg-white p-8 shadow-xl">
          <div className="space-y-2 text-center">
            <h1 className="font-inria text-dark-900 text-3xl font-bold">
              Readers&apos; Choice
            </h1>
            <p className="text-dark-600">
              Your joyful book club community awaits
            </p>
          </div>

          {mode !== "register" && (
            <div className="border-dark-200 flex border-b">
              <button
                onClick={() => setMode("google")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === "google"
                    ? "text-gold-600 border-gold-600 border-b-2"
                    : "text-dark-500 hover:text-dark-700"
                }`}
              >
                Google
              </button>
              <button
                onClick={() => setMode("credentials")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === "credentials"
                    ? "text-gold-600 border-gold-600 border-b-2"
                    : "text-dark-500 hover:text-dark-700"
                }`}
              >
                Email & Password
              </button>
            </div>
          )}

          <div className="pt-4">
            {mode === "google" && (
              <>
                <SignInButton />
                <p className="text-dark-500 mt-6 text-center text-sm">
                  Sign in to create or join book clubs, vote on books, and rank
                  your favorites
                </p>
              </>
            )}
            {mode === "credentials" && (
              <CredentialsForm onSwitchToRegister={() => setMode("register")} />
            )}
            {mode === "register" && (
              <RegisterForm onSwitchToLogin={() => setMode("credentials")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
