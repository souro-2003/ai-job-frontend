"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, PartyPopper, Plus, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore, isSubscribed } from "@/store/authStore";
import JobCard from "@/components/JobCard";
import type { Application, ApplicationStatus, CandidateProfile, Job } from "@/types";

interface Usage {
  resumes: { used: number; limit: number };
  applications: { used: number; limit: number };
  aiChats: { used: number; limit: number };
}

interface HiredOffer {
  id: string;
  hiredAt: string;
  jobTitle: string;
  jobSlug: string;
  company: string;
  location: string | null;
}

/** The first four are the live funnel; the last two are outcomes. */
const FUNNEL: Array<{ key: ApplicationStatus; label: string }> = [
  { key: "APPLIED", label: "Applied" },
  { key: "VIEWED", label: "Viewed" },
  { key: "SHORTLISTED", label: "Shortlisted" },
  { key: "INTERVIEW", label: "Interview" },
];

const OUTCOMES: Array<{ key: ApplicationStatus; label: string }> = [
  { key: "HIRED", label: "Hired" },
  { key: "REJECTED", label: "Closed" },
];

const PAGE_CSS = `
@keyframes db-fall {
  0%   { transform: translateY(-12vh) rotate(0deg); opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(104vh) rotate(900deg); opacity: 0; }
}
@keyframes db-pop {
  0%   { transform: scale(.85); opacity: 0; }
  55%  { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes db-ring {
  from { stroke-dashoffset: var(--ring-start); }
  to   { stroke-dashoffset: var(--ring-end); }
}
.db-confetti {
  position: fixed; top: 0; width: 9px; height: 15px;
  pointer-events: none; z-index: 9999;
  animation-name: db-fall;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
.db-pop { animation: db-pop .45s cubic-bezier(.2,.9,.3,1.3) both; }
.db-ring { animation: db-ring 1.1s cubic-bezier(.3,.8,.3,1) both; }
`;

const CONFETTI_COLORS = [
  "#1d3c58",
  "#2e9e6b",
  "#e8b04b",
  "#d2603f",
  "#6b5bd2",
  "#3aa6c9",
];

function Confetti({ pieces = 80 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.8,
        duration: 2.6 + Math.random() * 2.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.7,
        width: 7 + Math.random() * 5,
      })),
    [pieces]
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 9999 }}>
      {bits.map((b) => (
        <span
          key={b.id}
          className="db-confetti"
          style={{
            left: `${b.left}%`,
            width: `${b.width}px`,
            background: b.color,
            borderRadius: b.round ? "50%" : "2px",
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Profile completeness as a radial gauge; the arc draws once on load. */
function StrengthRing({ value }: { value: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, value) / 100);

  return (
    <div className="relative h-[120px] w-[120px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-shell" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="db-ring text-brand"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={
            {
              "--ring-start": `${circumference}`,
              "--ring-end": `${offset}`,
            } as React.CSSProperties
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-700 leading-none text-ink">{value}</span>
        <span className="mt-0.5 text-xs text-ink-faint">of 100</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [recommended, setRecommended] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationCount, setApplicationCount] = useState(0);
  const [resumeCount, setResumeCount] = useState(0);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [hired, setHired] = useState<HiredOffer[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [profileRes, appsRes, resumesRes, subRes, hiredRes] =
        await Promise.allSettled([
          api.get("/profile"),
          api.get("/applications/mine", { params: { limit: 50 } }),
          api.get("/resumes"),
          api.get("/payments/subscription"),
          api.get("/applications/hired"),
        ]);

      if (profileRes.status === "fulfilled") setProfile(profileRes.value.data.profile);
      if (appsRes.status === "fulfilled") {
        setApplications(appsRes.value.data.applications ?? []);
        setApplicationCount(appsRes.value.data.pagination.total);
      }
      if (resumesRes.status === "fulfilled") setResumeCount(resumesRes.value.data.count);
      if (subRes.status === "fulfilled") setUsage(subRes.value.data.usage ?? null);
      if (hiredRes.status === "fulfilled") setHired(hiredRes.value.data.hired ?? []);

      try {
        const { data } = await api.get("/jobs/recommended", { params: { limit: 8 } });
        setRecommended(data.jobs);
      } catch {
        setRecommended([]);
      }

      setLoading(false);
    }

    void load();
  }, []);

  useEffect(() => {
    if (hired.length === 0) return;

    setCelebrate(true);
    const timer = window.setTimeout(() => setCelebrate(false), 7000);
    return () => window.clearTimeout(timer);
  }, [hired.length]);

  const paid = isSubscribed(user);
  const score = profile?.profileScore ?? 0;
  const latestOffer = hired[0];

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<ApplicationStatus, number>> = {};
    for (const a of applications) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return counts;
  }, [applications]);

  const liveApplications = applications.filter(
    (a) => a.status !== "REJECTED" && a.status !== "HIRED"
  ).length;

  /** Skills asked for by the most matching jobs that the candidate lacks. */
  const skillGaps = useMemo(() => {
    const tally = new Map<string, number>();

    for (const job of recommended) {
      for (const skill of job.match?.missingSkills ?? []) {
        tally.set(skill, (tally.get(skill) ?? 0) + 1);
      }
    }

    return [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, jobs]) => ({ name, jobs }));
  }, [recommended]);

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
      <div className="mx-auto max-w-[1400px] px-6 py-10 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      <style>{PAGE_CSS}</style>
      {celebrate && <Confetti />}

      {/* ---------------- compact command bar ---------------- */}
      <div className="rounded-card border border-line bg-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-600 leading-tight tracking-tight text-ink">
              {user?.fullName ? `Hello, ${user.fullName.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className="mt-0.5 truncate text-sm text-ink-soft">
              {liveApplications > 0
                ? `${liveApplications} application${liveApplications === 1 ? "" : "s"} still in play · ${applicationCount} sent in total`
                : paid
                  ? "Nothing in flight. Pick a role below and send your first application."
                  : "Browsing and fit scores are free. A plan unlocks applying."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/resumes"
              className="rounded border border-line px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-shell"
            >
              {resumeCount} resume{resumeCount === 1 ? "" : "s"}
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 rounded bg-brand px-4 py-1.5 text-sm font-medium text-paper hover:bg-brand-deep"
            >
              <Plus size={15} />
              Find jobs
            </Link>
          </div>
        </div>

        {/* funnel, inside the same card so the top stays one block */}
        <div className="flex flex-wrap items-stretch border-t border-line">
          {FUNNEL.map((stage, i) => {
            const count = stageCounts[stage.key] ?? 0;

            return (
              <div key={stage.key} className="flex flex-1 items-center">
                <Link
                  href={`/applications?status=${stage.key}`}
                  className="flex flex-1 items-baseline gap-2 px-5 py-3 hover:bg-shell/60"
                >
                  <span
                    className={`font-display text-xl font-600 ${
                      count === 0 ? "text-ink-faint" : "text-ink"
                    }`}
                  >
                    {count}
                  </span>
                  <span className="text-sm text-ink-soft">{stage.label}</span>
                </Link>

                {i < FUNNEL.length - 1 && (
                  <ChevronRight size={14} className="shrink-0 text-line" />
                )}
              </div>
            );
          })}

          <div className="flex items-stretch border-l border-line">
            {OUTCOMES.map((stage) => {
              const count = stageCounts[stage.key] ?? 0;

              return (
                <Link
                  key={stage.key}
                  href={`/applications?status=${stage.key}`}
                  className="flex items-baseline gap-2 px-5 py-3 hover:bg-shell/60"
                >
                  <span
                    className={`font-display text-xl font-600 ${
                      count === 0
                        ? "text-ink-faint"
                        : stage.key === "HIRED"
                          ? "text-fit"
                          : "text-ink-soft"
                    }`}
                  >
                    {count}
                  </span>
                  <span className="text-sm text-ink-soft">{stage.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------- hired strip ---------------- */}
      {latestOffer && (
        <div className="db-pop mt-4 flex flex-wrap items-center gap-4 rounded-card border border-fit/30 bg-fit-soft px-5 py-3">
          <PartyPopper size={22} className="shrink-0 text-fit" />

          <p className="min-w-0 flex-1 text-sm text-ink">
            <span className="font-600">
              {latestOffer.company} hired you for {latestOffer.jobTitle}.
            </span>{" "}
            <span className="text-ink-soft">
              {hired.length > 1
                ? `${hired.length} offers in hand.`
                : "They will be in touch about the next steps."}
            </span>
          </p>

          <div className="flex shrink-0 gap-2">
            <Link
              href={`/jobs/${latestOffer.jobSlug}`}
              className="rounded bg-fit px-3.5 py-1.5 text-sm font-medium text-paper hover:opacity-90"
            >
              View the job
            </Link>
            <button
              onClick={() => {
                setCelebrate(false);
                window.setTimeout(() => setCelebrate(true), 50);
              }}
              className="rounded border border-fit/40 px-3.5 py-1.5 text-sm font-medium text-fit hover:bg-fit/10"
            >
              Celebrate again
            </button>
          </div>
        </div>
      )}

      {/* ---------------- two columns ---------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-display text-base font-600 text-ink">Jobs that fit you</h2>
            <Link href="/jobs" className="text-sm text-brand hover:underline">
              See all jobs
            </Link>
          </div>

          <div className="mt-2 overflow-hidden rounded-card border border-line">
            {recommended.length === 0 ? (
              <div className="bg-paper p-10 text-center">
                <p className="text-sm text-ink">Nothing to recommend yet.</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {score < 40
                    ? "Matching needs something to work with — add your skills and experience."
                    : "No open role matches your profile right now. New jobs arrive daily."}
                </p>
                <Link
                  href={score < 40 ? "/profile" : "/jobs"}
                  className="mt-4 inline-block rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell"
                >
                  {score < 40 ? "Open profile" : "Browse all jobs"}
                </Link>
              </div>
            ) : (
              recommended.map((job) => <JobCard key={job.id} job={job} />)
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-paper p-5">
            <h3 className="text-sm font-600 text-ink">Profile strength</h3>

            <div className="mt-3 flex justify-center">
              <StrengthRing value={score} />
            </div>

            {gaps.length > 0 ? (
              <>
                <ul className="mt-3 space-y-1.5">
                  {gaps.slice(0, 3).map((gap) => (
                    <li key={gap} className="flex items-start gap-2 text-sm text-ink-soft">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-locked" />
                      {gap}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/profile"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-shell"
                >
                  Finish your profile
                  <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <p className="mt-3 text-center text-sm text-ink-soft">
                Complete. Matching has everything it needs.
              </p>
            )}
          </div>

          {skillGaps.length > 0 && (
            <div className="rounded-card border border-line bg-paper p-5">
              <h3 className="text-sm font-600 text-ink">Skills worth learning</h3>
              <p className="mt-0.5 text-xs text-ink-faint">
                Asked for by the roles you nearly match.
              </p>

              <ul className="mt-3 space-y-2">
                {skillGaps.map((skill) => (
                  <li key={skill.name} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-ink">{skill.name}</span>
                    <span className="shrink-0 rounded bg-shell px-2 py-0.5 text-xs text-ink-soft">
                      {skill.jobs} job{skill.jobs === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href="/profile" className="mt-3 block text-sm text-brand hover:underline">
                Already know one? Add it
              </Link>
            </div>
          )}

          {paid && usage ? (
            <div className="rounded-card border border-line bg-paper p-5">
              <h3 className="text-sm font-600 text-ink">Plan usage</h3>

              <div className="mt-3 space-y-3">
                {[
                  { label: "Resumes", ...usage.resumes },
                  { label: "Applications", ...usage.applications },
                  { label: "AI chats", ...usage.aiChats },
                ].map((item) => {
                  const pct = item.limit > 0 ? Math.min(100, (item.used / item.limit) * 100) : 0;
                  const nearlyOut = item.limit > 0 && pct >= 85;

                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-soft">{item.label}</span>
                        <span className={nearlyOut ? "text-locked" : "text-ink"}>
                          {item.used}
                          {item.limit > 0 ? ` / ${item.limit}` : " used"}
                        </span>
                      </div>
                      {item.limit > 0 && (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-shell">
                          <div
                            className={`h-full ${nearlyOut ? "bg-locked" : "bg-brand"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-locked/30 bg-locked-soft p-5">
              <Lock size={18} className="text-locked" />
              <h3 className="mt-2 text-sm font-600 text-ink">Applying needs a paid plan</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Browsing and fit scores stay free. Saving a resume and sending
                applications are on Basic and Pro.
              </p>
              <Link
                href="/pricing"
                className="mt-3 flex items-center justify-center gap-1.5 rounded bg-locked px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
              >
                See plans
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}