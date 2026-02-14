"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

interface CredentialsFormProps {
  onSwitchToRegister: () => void;
}

export function CredentialsForm({ onSwitchToRegister }: CredentialsFormProps) {
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
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else if (result?.ok) {
      window.location.href = "/dashboard";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="text-dark-700 mb-1 block text-sm font-medium"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-dark-200 focus:ring-gold-500 w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="text-dark-700 mb-1 block text-sm font-medium"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border-dark-200 focus:ring-gold-500 w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="Enter your password"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-gold-600 hover:bg-gold-700 w-full rounded-lg py-3 font-medium text-white transition-colors disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-dark-600 text-center text-sm">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-gold-600 font-medium hover:underline"
        >
          Register
        </button>
      </p>
    </form>
  );
}
