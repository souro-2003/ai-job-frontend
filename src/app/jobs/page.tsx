"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Target, X } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import JobCard from "@/components/JobCard";
import type { Job, Pagination } from "@/types";

const LEVELS = [
  { value: "", label: "Any level" },
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
];

const TYPES = [
  { value: "", label: "Any type" },
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
];

const WORK_SITES = [
  { value: "", label: "Any work site" },
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
];

const COUNTRIES = [
  { value: "", label: "Any country" },
  { value: "India", label: "India" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
  { value: "United Arab Emirates", label: "UAE" },
  { value: "Singapore", label: "Singapore" },
];

/** Candidates see jobs at or above this fit score unless they ask for all. */
const FIT_THRESHOLD = 60;

const fieldClass =
  "w-full min-w-0 rounded border border-line bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

export default function JobsPage() {
  const user = useAuthStore((state) => state.user);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Draft values the user is typing; applied values drive the request.
  const [draft, setDraft] = useState({
    search: "",
    city: "",
    state: "",
    country: "",
    level: "",
    jobType: "",
    workSite: "",
  });
  const [applied, setApplied] = useState(draft);

  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [fitOnly, setFitOnly] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/jobs", {
        params: {
          page,
          sort,
          search: applied.search || undefined,
          city: applied.city || undefined,
          state: applied.state || undefined,
          country: applied.country || undefined,
          level: applied.level || undefined,
          jobType: applied.jobType || undefined,
          workSite: applied.workSite || undefined,
        },
      });
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch {
      setError("Could not load jobs. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, [page, sort, applied]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: keyof typeof draft, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /** Dropdowns apply straight away; text inputs wait for Search or blur. */
  const setAndApply = (key: keyof typeof draft, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setApplied(next);
    setPage(1);
  };

  const applySearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    setApplied(draft);
    setPage(1);
  };

  const clearAll = () => {
    const empty = {
      search: "",
      city: "",
      state: "",
      country: "",
      level: "",
      jobType: "",
      workSite: "",
    };
    setDraft(empty);
    setApplied(empty);
    setPage(1);
  };

  const activeCount = Object.entries(applied).filter(
    ([key, value]) => key !== "search" && value !== ""
  ).length;

  // Scores only exist for candidates with enough profile data to match on.
  const scored = useMemo(() => jobs.filter((job) => job.match), [jobs]);
  const canFilterByFit = user?.role === "CANDIDATE" && scored.length > 0;

  const visibleJobs = useMemo(() => {
    if (!canFilterByFit || !fitOnly) return jobs;
    return jobs.filter((job) => (job.match?.total ?? 0) >= FIT_THRESHOLD);
  }, [jobs, canFilterByFit, fitOnly]);

  const hiddenCount = jobs.length - visibleJobs.length;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      {/* ---------------- filter bar ---------------- */}
      <form
        onSubmit={applySearch}
        className="rounded-card border border-line bg-paper px-3 py-2.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-[2]">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={draft.search}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Job title or keyword"
              className={`${fieldClass} pl-8`}
            />
          </div>

          <input
            value={draft.city}
            onChange={(e) => set("city", e.target.value)}
            onBlur={() => draft.city !== applied.city && applySearch()}
            placeholder="City"
            className={`${fieldClass} flex-1 basis-[110px]`}
          />

          <input
            value={draft.state}
            onChange={(e) => set("state", e.target.value)}
            onBlur={() => draft.state !== applied.state && applySearch()}
            placeholder="State"
            className={`${fieldClass} flex-1 basis-[110px]`}
          />

          <select
            value={draft.country}
            onChange={(e) => setAndApply("country", e.target.value)}
            className={`${fieldClass} flex-1 basis-[130px]`}
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={draft.workSite}
            onChange={(e) => setAndApply("workSite", e.target.value)}
            className={`${fieldClass} flex-1 basis-[120px]`}
          >
            {WORK_SITES.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>

          <select
            value={draft.jobType}
            onChange={(e) => setAndApply("jobType", e.target.value)}
            className={`${fieldClass} flex-1 basis-[120px]`}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={draft.level}
            onChange={(e) => setAndApply("level", e.target.value)}
            className={`${fieldClass} flex-1 basis-[110px]`}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="shrink-0 rounded bg-brand px-4 py-1.5 text-sm font-medium text-paper hover:bg-brand-deep"
          >
            Search
          </button>

          {(activeCount > 0 || applied.search) && (
            <button
              type="button"
              onClick={clearAll}
              title="Clear filters"
              className="shrink-0 rounded border border-line p-1.5 text-ink-faint hover:bg-shell hover:text-ink"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </form>

      {/* ---------------- result bar ---------------- */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink-soft">
            {loading
              ? "Loading…"
              : canFilterByFit && fitOnly
                ? `${visibleJobs.length} of ${pagination?.total ?? jobs.length} jobs`
                : `${pagination?.total ?? 0} jobs`}
          </span>

          {canFilterByFit && (
            <button
              onClick={() => setFitOnly(!fitOnly)}
              className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs ${
                fitOnly
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-line text-ink-soft hover:bg-shell hover:text-ink"
              }`}
            >
              <Target size={13} />
              {fitOnly
                ? `${FIT_THRESHOLD}%+ fit${hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}`
                : "Showing all"}
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="rounded border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="recent">Newest first</option>
          <option value="popular">Most viewed</option>
          {user?.role === "CANDIDATE" && <option value="match">Best fit</option>}
        </select>
      </div>

      {/* ---------------- results ---------------- */}
      <div className="mt-3 overflow-hidden rounded-card border border-line">
        {loading ? (
          <div className="bg-paper p-10 text-center text-sm text-ink-soft">
            Loading jobs…
          </div>
        ) : error ? (
          <div className="bg-paper p-10 text-center text-sm text-alert">{error}</div>
        ) : visibleJobs.length === 0 ? (
          <div className="bg-paper p-10 text-center">
            {canFilterByFit && fitOnly && jobs.length > 0 ? (
              <>
                <p className="text-sm text-ink">
                  Nothing here fits you at {FIT_THRESHOLD}% or better.
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  Add more skills to your profile, or look at the weaker matches.
                </p>
                <button
                  onClick={() => setFitOnly(false)}
                  className="mt-4 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell"
                >
                  Show all {jobs.length} jobs
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ink">No jobs match this search.</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Try removing a filter or searching a different title.
                </p>
                {activeCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="mt-4 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell"
                  >
                    Clear filters
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          visibleJobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-line bg-paper px-3 py-1.5 text-sm text-ink disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-ink-soft">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            className="rounded border border-line bg-paper px-3 py-1.5 text-sm text-ink disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}