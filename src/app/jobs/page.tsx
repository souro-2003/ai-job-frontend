"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
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

export default function JobsPage() {
  const user = useAuthStore((state) => state.user);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [level, setLevel] = useState("");
  const [jobType, setJobType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/jobs", {
        params: {
          page,
          search: search || undefined,
          city: city || undefined,
          level: level || undefined,
          jobType: jobType || undefined,
          remote: remoteOnly ? "true" : undefined,
          sort,
        },
      });
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch {
      setError("Could not load jobs. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, [page, search, city, level, jobType, remoteOnly, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    void load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl text-ink">Open jobs</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {user?.role === "CANDIDATE"
          ? "Each job shows how well it fits your profile."
          : "Log in as a candidate to see your fit score on each job."}
      </p>

      <form onSubmit={handleSearch} className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Job title or keyword"
            className="w-full rounded border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="rounded border border-line bg-paper px-3 text-ink-soft hover:bg-shell"
          aria-label="Filters"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={16} />
        </button>
        <button
          type="submit"
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
        >
          Search
        </button>
      </form>

      {showFilters && (
        <div className="mt-3 grid gap-3 rounded-card border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="rounded border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="rounded border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="rounded border-line"
            />
            Remote only
          </label>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {pagination ? `${pagination.total} jobs` : "\u00A0"}
        </p>
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

      <div className="mt-3 overflow-hidden rounded-card border border-line">
        {loading ? (
          <div className="bg-paper p-10 text-center text-sm text-ink-soft">
            Loading jobs…
          </div>
        ) : error ? (
          <div className="bg-paper p-10 text-center text-sm text-alert">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="bg-paper p-10 text-center">
            <p className="text-sm text-ink">No jobs match this search.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Try removing a filter or searching a different title.
            </p>
          </div>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
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