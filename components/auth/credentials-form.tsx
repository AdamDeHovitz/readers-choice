"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState } from "react";
import { signIn } from "next-auth/react";

interface CredentialsFormProps {
  onSwitchToRegister: () => void;
  callbackUrl?: string;
}

export function CredentialsForm({
  onSwitchToRegister,
  callbackUrl = "/dashboard",
}: CredentialsFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else if (result?.ok) {
      window.location.href = result.url ?? callbackUrl;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="text-foreground mb-1.5 block text-sm font-bold"
        >
          Email
        </label>
        <Input
          id="email"
          autoComplete="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="text-foreground mb-1.5 block text-sm font-bold"
        >
          Password
        </label>
        <Input
          id="password"
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
        />
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? "Signing in..." : "Sign In"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary font-bold hover:underline"
        >
          Register
        </button>
      </p>
    </form>
  );
}
