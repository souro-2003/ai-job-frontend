"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ApiError } from "@/lib/api";

type Role = "CANDIDATE" | "EMPLOYER";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { register, loading } = useAuthStore();

  const [role, setRole] = useState<Role>(
    params.get("role") === "employer" ? "EMPLOYER" : "CANDIDATE"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      const user = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        role,
      });
      router.push(user.role === "EMPLOYER" ? "/employer/company" : "/profile");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not create the account. Try again."
      );
    }
  }

  return (
    <div className="rounded-card border border-line bg-paper p-7">
      <h1 className="text-2xl text-ink">Create your account</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Takes a minute. You can browse jobs straight after.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line">
        <button
          type="button"
          onClick={() => setRole("CANDIDATE")}
          className={`px-3 py-2.5 text-sm ${
            role === "CANDIDATE"
              ? "bg-brand font-medium text-paper"
              : "bg-paper text-ink-soft hover:bg-shell"
          }`}
        >
          Looking for a job
        </button>
        <button
          type="button"
          onClick={() => setRole("EMPLOYER")}
          className={`px-3 py-2.5 text-sm ${
            role === "EMPLOYER"
              ? "bg-brand font-medium text-paper"
              : "bg-paper text-ink-soft hover:bg-shell"
          }`}
        >
          Hiring
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-ink">
            Full name
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
            className="mt-1.5 w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            placeholder="Your name"
          />
        </div>

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
          <label htmlFor="phone" className="block text-sm font-medium text-ink">
            Phone <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className="mt-1.5 w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            placeholder="+91 98765 43210"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1.5 w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            placeholder="At least 8 characters"
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
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-sm text-ink-soft">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="rounded-card border border-line bg-paper p-7 text-sm text-ink-soft">
            Loading…
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}