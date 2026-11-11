"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState } from "react";
import { signIn } from "next-auth/react";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  callbackUrl?: string;
}

export function RegisterForm({
  onSwitchToLogin,
  callbackUrl = "/dashboard",
}: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    // Auto-login after successful registration
    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      window.location.href = result.url ?? callbackUrl;
    } else {
      setError("Account created but login failed. Please try logging in.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="text-foreground mb-1.5 block text-sm font-bold"
        >
          Name
        </label>
        <Input
          id="name"
          autoComplete="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="text-foreground mb-1.5 block text-sm font-bold"
        >
          Email
        </label>
        <Input
          id="register-email"
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
          htmlFor="register-password"
          className="text-foreground mb-1.5 block text-sm font-bold"
        >
          Password
        </label>
        <Input
          id="register-password"
          autoComplete="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? "Creating account..." : "Create Account"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary font-bold hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
