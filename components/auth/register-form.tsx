"use client";

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
          className="text-dark-700 mb-1 block text-sm font-medium"
        >
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="border-dark-200 focus:ring-gold-500 w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="text-dark-700 mb-1 block text-sm font-medium"
        >
          Email
        </label>
        <input
          id="register-email"
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
          htmlFor="register-password"
          className="text-dark-700 mb-1 block text-sm font-medium"
        >
          Password
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="border-dark-200 focus:ring-gold-500 w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="At least 8 characters"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-gold-600 hover:bg-gold-700 w-full rounded-lg py-3 font-medium text-white transition-colors disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-dark-600 text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-gold-600 font-medium hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
