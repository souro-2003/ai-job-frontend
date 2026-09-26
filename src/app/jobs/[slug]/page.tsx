"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Users,
  Lock,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import api, { ApiError, formatSalary, timeAgo } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Job, MatchBreakdown } from "@/types";

interface Advice {
  verdict: string;
  strengths: string[];
  gaps: string[];
  actions: string[];
  coverLetterAngle: string;
}

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

function scoreStyle(total: number): string {
  if (total >= 70) return "bg-fit-soft text-fit";
  if (total >= 45) return "bg-locked-soft text-locked";
  return "bg-shell text-ink-soft";
}

export default function JobDetailPage() {
  const params = useParams<{ slug: string }>();
  const user = useAuthStore((state) => state.user);

  const [job, setJob] = useState<Job | null>(null);
  const [match, setMatch] = useState<MatchBreakdown | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [coverLetter, setCoverLetter] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [locked, setLocked] = useState<{ message: string; code?: string } | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [advice, setAdvice] = useState<Advice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/jobs/${params.slug}`);
        setJob(data.job);
        setMatch(data.match);
        setHasApplied(data.hasApplied);
      } catch {
        setError("This job could not be found.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.slug]);

  async function apply() {
    if (!job) return;

    setApplying(true);
    setError("");
    setLocked(null);

    try {
      await api.post("/applications", {
        jobId: job.id,
        coverLetter: coverLetter || undefined,
      });
      setHasApplied(true);
      setShowApply(false);
      setMessage("Application sent.");
    } catch (err) {
      if (err instanceof ApiError && (err.isPaywall || err.code === "RESUME_REQUIRED")) {
        setLocked({ message: err.message, code: err.code });
      } else {
        setError(err instanceof ApiError ? err.message : "Could not apply.");
      }
    } finally {
      setApplying(false);
    }
  }

  async function getAdvice() {
    if (!job) return;

    setAdviceLoading(true);
    setError("");

    try {
      const { data } = await api.post("/ai/job-advice", { jobId: job.id });
      setAdvice(data.advice);
    } catch (err) {
      if (err instanceof ApiError && err.isPaywall) {
        setLocked({ message: err.message });
      } else {
        setError(
          err instanceof ApiError ? err.message : "Could not get advice right now."
        );
      }
    } finally {
      setAdviceLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-alert">{error || "Job not found."}</p>
        <Link href="/jobs" className="mt-3 inline-block text-sm text-brand hover:underline">
          Back to jobs
        </Link>
      </div>
    );
  }

  const location = job.isRemote
    ? "Remote"
    : [job.city, job.state].filter(Boolean).join(", ") || "Location not set";

  const isCandidate = user?.role === "CANDIDATE";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} />
        All jobs
      </Link>

      <div className="mt-4 rounded-card border border-line bg-paper p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl text-ink">{job.title}</h1>
            <Link
              href={`/companies/${job.company.slug}`}
              className="mt-1 inline-block text-sm text-ink-soft hover:text-ink"
            >
              {job.company.name}
              {job.company.isVerified && <span className="ml-1.5 text-fit">✓</span>}
            </Link>
          </div>

          {match && (
            <div
              className={`shrink-0 rounded px-3 py-1.5 text-base font-600 ${scoreStyle(match.total)}`}
            >
              {match.total}% fit
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-ink-faint" />
            {location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase size={14} className="text-ink-faint" />
            {job.minExperience}
            {job.maxExperience ? `–${job.maxExperience}` : "+"} yrs
          </span>
          <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
          <span className="rounded bg-shell px-2 py-0.5 text-xs">
            {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-faint">
            <Users size={14} />
            {job._count?.applications ?? 0} applied
          </span>
        </div>

        <p className="mt-3 text-xs text-ink-faint">
          Posted {timeAgo(job.createdAt)} · {job.vacancies} opening
          {job.vacancies === 1 ? "" : "s"} · {job.views} views
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {hasApplied ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-fit-soft px-4 py-2 text-sm font-medium text-fit">
              <Check size={15} />
              You have applied
            </span>
          ) : isCandidate ? (
            <button
              onClick={() => setShowApply(true)}
              className="rounded bg-brand px-5 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
            >
              Apply for this job
            </button>
          ) : !user ? (
            <Link
              href="/signup"
              className="rounded bg-brand px-5 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
            >
              Sign up to apply
            </Link>
          ) : null}

          {isCandidate && match && (
            <button
              onClick={getAdvice}
              disabled={adviceLoading}
              className="inline-flex items-center gap-1.5 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell disabled:opacity-60"
            >
              <Sparkles size={15} />
              {adviceLoading ? "Thinking…" : "Should I apply?"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="mt-4 rounded border border-fit/30 bg-fit-soft px-3 py-2 text-sm text-fit">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {locked && (
        <div className="mt-4 rounded-card border border-locked/30 bg-locked-soft p-5">
          <div className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 shrink-0 text-locked" />
            <div>
              <h2 className="text-base font-600 text-ink">{locked.message}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {locked.code === "RESUME_REQUIRED"
                  ? "Build a resume first — it starts from your profile, so it takes a minute."
                  : "Applying and the AI assistant are on the Basic and Pro plans."}
              </p>
              <Link
                href={locked.code === "RESUME_REQUIRED" ? "/resumes" : "/pricing"}
                className="mt-3 inline-block rounded bg-locked px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
              >
                {locked.code === "RESUME_REQUIRED" ? "Build a resume" : "See plans"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Apply box */}
      {showApply && !hasApplied && (
        <div className="mt-4 rounded-card border border-line bg-paper p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg text-ink">Apply</h2>
            <button
              onClick={() => setShowApply(false)}
              className="p-1 text-ink-faint hover:text-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <p className="mt-1 text-sm text-ink-soft">
            Your primary resume is sent automatically.
          </p>

          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={5}
            placeholder="Optional. A few lines on why you fit this role."
            className="mt-3 w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />

          {advice?.coverLetterAngle && (
            <p className="mt-2 text-sm text-ink-soft">
              Tip: {advice.coverLetterAngle}
            </p>
          )}

          <button
            onClick={apply}
            disabled={applying}
            className="mt-3 rounded bg-brand px-5 py-2 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
          >
            {applying ? "Sending…" : "Send application"}
          </button>
        </div>
      )}

      {/* Match breakdown */}
      {match && (
        <div className="mt-4 rounded-card border border-line bg-paper p-6">
          <h2 className="text-lg text-ink">Why this score</h2>

          <div className="mt-4 space-y-3">
            {[
              { label: "Skills", value: match.skills, max: 55 },
              { label: "Experience", value: match.experience, max: 20 },
              { label: "Location", value: match.location, max: 15 },
              { label: "Job title", value: match.title, max: 10 },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">{row.label}</span>
                  <span className="text-ink">
                    {row.value} / {row.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-shell">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${(row.value / row.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {match.matchedSkills.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-600 text-ink">Skills you have</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-fit-soft px-2 py-0.5 text-sm text-fit"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {match.missingSkills.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-600 text-ink">Skills you are missing</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-locked-soft px-2 py-0.5 text-sm text-locked"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                Add any of these to your profile if you already know them.
              </p>
            </div>
          )}
        </div>
      )}

      {/* AI advice */}
      {advice && (
        <div className="mt-4 rounded-card border border-line bg-paper p-6">
          <h2 className="text-lg text-ink">Asha&apos;s take</h2>
          <p className="mt-2 text-sm text-ink">{advice.verdict}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {advice.strengths.length > 0 && (
              <div>
                <h3 className="text-sm font-600 text-fit">In your favour</h3>
                <ul className="mt-1.5 space-y-1">
                  {advice.strengths.map((item, i) => (
                    <li key={i} className="text-sm text-ink-soft">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {advice.gaps.length > 0 && (
              <div>
                <h3 className="text-sm font-600 text-locked">Against you</h3>
                <ul className="mt-1.5 space-y-1">
                  {advice.gaps.map((item, i) => (
                    <li key={i} className="text-sm text-ink-soft">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {advice.actions.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-sm font-600 text-ink">Do this before applying</h3>
              <ul className="mt-1.5 space-y-1">
                {advice.actions.map((item, i) => (
                  <li key={i} className="text-sm text-ink-soft">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="mt-4 mb-10 rounded-card border border-line bg-paper p-6">
        <h2 className="text-lg text-ink">About the role</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {job.description}
        </p>

        {job.responsibilities && (
          <div className="mt-5">
            <h3 className="text-base font-600 text-ink">Responsibilities</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
              {job.responsibilities}
            </p>
          </div>
        )}

        {job.requirements && (
          <div className="mt-5">
            <h3 className="text-base font-600 text-ink">Requirements</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
              {job.requirements}
            </p>
          </div>
        )}

        {job.skills.length > 0 && (
          <div className="mt-5">
            <h3 className="text-base font-600 text-ink">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.skills.map((item) => (
                <span
                  key={item.skillId}
                  className={`rounded px-2 py-0.5 text-sm ${
                    item.isRequired
                      ? "bg-shell text-ink"
                      : "border border-line text-ink-soft"
                  }`}
                >
                  {item.skill.name}
                  {item.isRequired ? "" : " (optional)"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}