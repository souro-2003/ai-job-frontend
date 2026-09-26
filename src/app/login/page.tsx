"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ApiError } from "@/lib/api";

function landingFor(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "EMPLOYER") return "/employer";
  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const user = await login(email.trim(), password);
      router.push(landingFor(user.role));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not log in. Try again."
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-card border border-line bg-paper p-7">
        <h1 className="text-2xl text-ink">Log in</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Pick up where you left off.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1.5 w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
              placeholder="Your password"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-brand px-4 py-2.5 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-sm text-ink-soft">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}