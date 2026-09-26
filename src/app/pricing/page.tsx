"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus } from "lucide-react";
import api, { ApiError, formatPaise } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Plan } from "@/types";

const FEATURE_ROWS = [
  { key: "browseJobs", label: "Browse jobs and see fit scores" },
  { key: "createResume", label: "Save and download resumes" },
  { key: "applyJobs", label: "Apply to jobs" },
  { key: "matchScore", label: "Detailed match breakdown" },
  { key: "aiChat", label: "AI career assistant" },
  { key: "voiceAssistant", label: "Voice assistant" },
  { key: "resumeReview", label: "AI resume review" },
  { key: "prioritySupport", label: "Priority support" },
];

export default function PricingPage() {
  const router = useRouter();
  const { user, loadUser } = useAuthStore();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/payments/plans");
        setPlans(data.plans);
      } catch {
        setError("Could not load plans.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function choosePlan(tier: string) {
    if (!user) {
      router.push("/signup");
      return;
    }

    setBuying(tier);
    setError("");
    setNotice("");

    try {
      const { data: order } = await api.post("/payments/order", { tier });
      const { data } = await api.post("/payments/verify", {
        paymentId: order.payment.id,
      });
      await loadUser();
      setNotice(data.message);
      window.setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not start the payment. Try again."
      );
    } finally {
      setBuying(null);
    }
  }

  const currentTier = user?.subscription?.status === "ACTIVE"
    ? user.subscription.plan.tier
    : "FREE";

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-ink-soft">
        Loading plans…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl text-ink">Plans</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Searching jobs and seeing your fit score costs nothing. Paid plans unlock
        saving a resume, applying, and the AI assistant.
      </p>

      {notice && (
        <p className="mt-5 rounded border border-fit/30 bg-fit-soft px-4 py-3 text-sm text-fit">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const features = (plan.features ?? {}) as Record<string, unknown>;
          const isCurrent = plan.tier === currentTier;
          const isFree = plan.tier === "FREE";

          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-card border bg-paper p-6 ${
                plan.tier === "PRO" ? "border-brand" : "border-line"
              }`}
            >
              <h2 className="text-lg font-600 text-ink">{plan.name}</h2>

              <div className="mt-3">
                <span className="text-3xl font-600 text-ink">
                  {plan.priceInPaise === 0 ? "Free" : formatPaise(plan.priceInPaise)}
                </span>
                {plan.priceInPaise > 0 && (
                  <span className="ml-1.5 text-sm text-ink-soft">
                    for {plan.durationDays} days
                  </span>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {FEATURE_ROWS.map((row) => {
                  const value = features[row.key];
                  const on = value === true || value === "limited";

                  return (
                    <li key={row.key} className="flex items-start gap-2 text-sm">
                      {on ? (
                        <Check size={15} className="mt-0.5 shrink-0 text-fit" />
                      ) : (
                        <Minus size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                      )}
                      <span className={on ? "text-ink" : "text-ink-faint"}>
                        {row.label}
                        {value === "limited" && " (limited)"}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 space-y-1 border-t border-line pt-4 text-sm text-ink-soft">
                <p>
                  Resumes:{" "}
                  {plan.resumeLimit === 0 ? "not included" : plan.resumeLimit}
                </p>
                <p>
                  Applications:{" "}
                  {plan.applyLimit === 0
                    ? isFree
                      ? "not included"
                      : "unlimited"
                    : plan.applyLimit}
                </p>
                <p>
                  AI chats:{" "}
                  {plan.aiChatLimit === 0
                    ? isFree
                      ? "not included"
                      : "unlimited"
                    : plan.aiChatLimit}
                </p>
              </div>

              <button
                onClick={() => choosePlan(plan.tier)}
                disabled={isFree || isCurrent || buying !== null}
                className={`mt-5 w-full rounded px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed ${
                  isCurrent
                    ? "bg-shell text-ink-soft"
                    : isFree
                      ? "bg-shell text-ink-faint"
                      : "bg-brand text-paper hover:bg-brand-deep disabled:opacity-60"
                }`}
              >
                {isCurrent
                  ? "Your current plan"
                  : isFree
                    ? "Included by default"
                    : buying === plan.tier
                      ? "Processing…"
                      : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 rounded-card border border-locked/30 bg-locked-soft px-4 py-3 text-sm text-ink-soft">
        Development mode: choosing a paid plan activates it immediately without
        taking payment. Connect Razorpay or Stripe before going live — the
        backend blocks this shortcut in production.
      </p>
    </div>
  );
}