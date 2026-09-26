"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore, isSubscribed } from "@/store/authStore";
import JobCard from "@/components/JobCard";
import type { CandidateProfile, Job } from "@/types";

interface Usage {
  resumes: { used: number; limit: number };
  applications: { used: number; limit: number };
  aiChats: { used: number; limit: number };
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [recommended, setRecommended] = useState<Job[]>([]);
  const [applicationCount, setApplicationCount] = useState(0);
  const [resumeCount, setResumeCount] = useState(0);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [profileRes, appsRes, resumesRes, subRes] = await Promise.allSettled([
        api.get("/profile"),
        api.get("/applications/mine", { params: { limit: 1 } }),
        api.get("/resumes"),
        api.get("/payments/subscription"),
      ]);

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value.data.profile);
      }
      if (appsRes.status === "fulfilled") {
        setApplicationCount(appsRes.value.data.pagination.total);
      }
      if (resumesRes.status === "fulfilled") {
        setResumeCount(resumesRes.value.data.count);
      }
      if (subRes.status === "fulfilled") {
        setUsage(subRes.value.data.usage ?? null);
      }

      try {
        const { data } = await api.get("/jobs/recommended", {
          params: { limit: 5 },
        });
        setRecommended(data.jobs);
      } catch {
        setRecommended([]);
      }

      setLoading(false);
    }

    void load();
  }, []);

  const paid = isSubscribed(user);
  const score = profile?.profileScore ?? 0;

  const gaps: string[] = [];
  if (profile) {
    if (!profile.headline) gaps.push("Add a headline");
    if (!profile.summary || profile.summary.length < 50) gaps.push("Write your summary");
    if (profile.skills.length < 3) gaps.push("Add at least 3 skills");
    if (profile.experiences.length === 0) gaps.push("Add your work experience");
    if (profile.educations.length === 0) gaps.push("Add your education");
    if (!profile.city) gaps.push("Set your city");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl text-ink">
        {user?.fullName ? `Hello, ${user.fullName.split(" ")[0]}` : "Dashboard"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {paid
          ? "Your plan is active. Apply to anything that fits."
          : "Browsing is free. Upgrade when you are ready to save a resume and apply."}
      </p>

      <div className="mt-6 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-5">
          <div className="text-2xl font-600 text-brand">{score}%</div>
          <div className="mt-0.5 text-sm text-ink-soft">Profile complete</div>
        </div>
        <div className="bg-paper p-5">
          <div className="text-2xl font-600 text-ink">{applicationCount}</div>
          <div className="mt-0.5 text-sm text-ink-soft">Applications sent</div>
        </div>
        <div className="bg-paper p-5">
          <div className="text-2xl font-600 text-ink">{resumeCount}</div>
          <div className="mt-0.5 text-sm text-ink-soft">Resumes saved</div>
        </div>
      </div>

      {!paid && (
        <div className="mt-5 rounded-card border border-locked/30 bg-locked-soft p-5">
          <div className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 shrink-0 text-locked" />
            <div>
              <h2 className="text-base font-600 text-ink">
                Applying needs a paid plan
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                You can browse every job and see your fit score for free. Saving a
                resume and sending applications are on the Basic and Pro plans.
              </p>
              <Link
                href="/pricing"
                className="mt-3 inline-flex items-center gap-1.5 rounded bg-locked px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
              >
                See plans
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {paid && usage && (
        <div className="mt-5 rounded-card border border-line bg-paper p-5">
          <h2 className="text-base font-600 text-ink">Your plan usage</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Resumes", ...usage.resumes },
              { label: "Applications", ...usage.applications },
              { label: "AI chats", ...usage.aiChats },
            ].map((item) => (
              <div key={item.label} className="text-sm">
                <div className="flex justify-between text-ink-soft">
                  <span>{item.label}</span>
                  <span>
                    {item.used}
                    {item.limit > 0 ? ` / ${item.limit}` : " used"}
                  </span>
                </div>
                {item.limit > 0 && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-shell">
                    <div
                      className="h-full bg-brand"
                      style={{
                        width: `${Math.min(100, (item.used / item.limit) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {gaps.length > 0 && (
        <div className="mt-5 rounded-card border border-line bg-paper p-5">
          <h2 className="text-base font-600 text-ink">
            Finish your profile to get better matches
          </h2>
          <ul className="mt-3 space-y-1.5">
            {gaps.map((gap) => (
              <li key={gap} className="text-sm text-ink-soft">
                {gap}
              </li>
            ))}
          </ul>
          <Link
            href="/profile"
            className="mt-4 inline-flex items-center gap-1.5 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell"
          >
            Open profile
            <ArrowRight size={15} />
          </Link>
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-ink">Jobs that fit you</h2>
          <Link href="/jobs" className="text-sm text-brand hover:underline">
            See all jobs
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-card border border-line">
          {recommended.length === 0 ? (
            <div className="bg-paper p-8 text-center">
              <p className="text-sm text-ink">No recommendations yet.</p>
              <p className="mt-1 text-sm text-ink-soft">
                {score < 40
                  ? "Add your skills and experience — matching needs something to work with."
                  : "No open jobs match your profile right now. Check back soon."}
              </p>
            </div>
          ) : (
            recommended.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </section>
    </div>
  );
}