"use client";

import { useState } from "react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { RegisterForm } from "@/components/auth/register-form";

type AuthMode = "google" | "credentials" | "register";

interface LoginFormProps {
  callbackUrl: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>("google");

  return (
    <div className="pt-safe pb-safe flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border-border space-y-6 rounded-3xl border p-6 shadow-sm sm:p-8">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-foreground text-4xl">
              Readers&apos; Choice
            </h1>
            <p className="text-muted-foreground">
              Sign in to see your book clubs
            </p>
          </div>

          {mode !== "register" && (
            <div
              role="group"
              aria-label="Sign-in method"
              className="bg-sage-100 flex gap-1 rounded-xl p-1"
            >
              <button
                aria-pressed={mode === "google"}
                onClick={() => setMode("google")}
                className={`h-10 flex-1 rounded-lg text-sm font-bold transition-colors ${
                  mode === "google"
                    ? "bg-sage-600 text-dark-900 shadow-sm"
                    : "text-sage-800 hover:bg-sage-200"
                }`}
              >
                Google
              </button>
              <button
                aria-pressed={mode === "credentials"}
                onClick={() => setMode("credentials")}
                className={`h-10 flex-1 rounded-lg text-sm font-bold transition-colors ${
                  mode === "credentials"
                    ? "bg-sage-600 text-dark-900 shadow-sm"
                    : "text-sage-800 hover:bg-sage-200"
                }`}
              >
                Email & Password
              </button>
            </div>
          )}

          <div>
            {mode === "google" && (
              <>
                <SignInButton callbackUrl={callbackUrl} />
                <p className="text-dark-500 mt-6 text-center text-sm">
                  Sign in to create or join book clubs, vote on books, and rank
                  your favorites
                </p>
              </>
            )}
            {mode === "credentials" && (
              <CredentialsForm
                callbackUrl={callbackUrl}
                onSwitchToRegister={() => setMode("register")}
              />
            )}
            {mode === "register" && (
              <RegisterForm
                callbackUrl={callbackUrl}
                onSwitchToLogin={() => setMode("credentials")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
