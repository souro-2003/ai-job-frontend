"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Eye, Users, Star } from "lucide-react";
import api, { timeAgo } from "@/lib/api";
import type { CompanyStatus, Pagination } from "@/types";

interface AdminJob {
  id: string;
  title: string;
  slug: string;
  jobType: string;
  city: string | null;
  isRemote: boolean;
  isActive: boolean;
  isFeatured: boolean;
  views: number;
  companyName: string | null;
  createdAt: string;
  expiresAt: string | null;
  company: { id: string; name: string; status: CompanyStatus } | null;
  postedByAdmin: { id: string; fullName: string } | null;
  displayCompany: string;
  postedBy: "ADMIN" | "EMPLOYER";
  uniqueViewers: number;
  _count: { applications: number; jobViews: number };
}

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Live" },
  { value: "inactive", label: "Closed" },
];

const SOURCE_FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "admin", label: "Posted by admin" },
  { value: "employer", label: "Posted by employers" },
];

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/jobs", {
        params: { page, status, source, search: query || undefined },
      });
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch {
      setError("Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, [page, status, source, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const runSearch = () => {
    setPage(1);
    setQuery(search.trim());
  };

  const toggleActive = async (job: AdminJob) => {
    setBusyId(job.id);

    try {
      await api.patch(`/admin/jobs/${job.id}/status`, { isActive: !job.isActive });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, isActive: !j.isActive } : j))
      );
    } catch {
      setError("Could not update that job.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleFeatured = async (job: AdminJob) => {
    setBusyId(job.id);

    try {
      await api.patch(`/admin/jobs/${job.id}/status`, {
        isFeatured: !job.isFeatured,
      });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, isFeatured: !j.isFeatured } : j))
      );
    } catch {
      setError("Could not update that job.");
    } finally {
      setBusyId(null);
    }
  };

  const removeJob = async (job: AdminJob) => {
    if (
      !window.confirm(
        `Delete "${job.title}"? Its applications and view history go with it.`
      )
    ) {
      return;
    }

    setBusyId(job.id);

    try {
      await api.delete(`/admin/jobs/${job.id}`);
      void load();
    } catch {
      setError("Could not delete that job.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">Jobs</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every job on the portal, posted by you or by employers.
            {pagination ? ` ${pagination.total} total.` : ""}
          </p>
        </div>

        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          <Plus size={16} />
          Add job
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Search title, company or city"
          className="min-w-[220px] flex-1 rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <button
          onClick={runSearch}
          className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink hover:bg-shell"
        >
          Search
        </button>

        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value);
          }}
          className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink"
        >
          {SOURCE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-card border border-line">
        {loading ? (
          <div className="bg-paper p-10 text-center text-sm text-ink-soft">
            Loading…
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-paper p-10 text-center text-sm text-ink">
            No jobs match this filter.{" "}
            <Link href="/admin/jobs/new" className="underline">
              Add the first one
            </Link>
            .
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-paper p-5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/jobs/${job.id}`}
                    className="text-base font-600 text-ink hover:underline"
                  >
                    {job.title}
                  </Link>

                  {job.isFeatured && (
                    <span className="rounded bg-shell px-2 py-0.5 text-xs text-ink-soft">
                      Featured
                    </span>
                  )}

                  {!job.isActive && (
                    <span className="rounded bg-shell px-2 py-0.5 text-xs text-ink-soft">
                      Closed
                    </span>
                  )}

                  {job.postedBy === "ADMIN" && (
                    <span className="rounded bg-shell px-2 py-0.5 text-xs text-ink-soft">
                      By admin
                    </span>
                  )}

                  {job.company && job.company.status !== "APPROVED" && (
                    <span className="rounded bg-locked-soft px-2 py-0.5 text-xs font-medium text-locked">
                      Company {job.company.status.toLowerCase()} — hidden
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-ink-soft">
                  {job.displayCompany} ·{" "}
                  {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
                  {job.isRemote ? " · Remote" : job.city ? ` · ${job.city}` : ""}
                </p>

                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
                  <span>Posted {timeAgo(job.createdAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} /> {job.views} views
                  </span>
                  <Link
                    href={`/admin/jobs/${job.id}`}
                    className="inline-flex items-center gap-1 hover:text-ink hover:underline"
                  >
                    <Users size={12} /> {job.uniqueViewers} visitors
                  </Link>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-600 text-ink">
                    {job._count.applications}
                  </div>
                  <div className="text-xs text-ink-faint">applicants</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void toggleFeatured(job)}
                    disabled={busyId === job.id}
                    title={job.isFeatured ? "Remove from featured" : "Feature this job"}
                    className={`rounded border border-line p-2 hover:bg-shell disabled:opacity-40 ${
                      job.isFeatured ? "text-ink" : "text-ink-faint"
                    }`}
                  >
                    <Star size={15} fill={job.isFeatured ? "currentColor" : "none"} />
                  </button>

                  <Link
                    href={`/jobs/${job.slug}`}
                    className="rounded border border-line p-2 text-ink-faint hover:bg-shell hover:text-ink"
                    title="View as candidate"
                  >
                    <ExternalLink size={15} />
                  </Link>
                </div>

                <div className="flex flex-col gap-1">
                  <Link
                    href={`/admin/jobs/${job.id}`}
                    className="rounded border border-line px-3 py-1.5 text-center text-xs text-ink hover:bg-shell"
                  >
                    Manage
                  </Link>
                  <button
                    onClick={() => void toggleActive(job)}
                    disabled={busyId === job.id}
                    className="rounded border border-line px-3 py-1.5 text-xs text-ink-soft hover:bg-shell disabled:opacity-40"
                  >
                    {job.isActive ? "Close" : "Reopen"}
                  </button>
                  <button
                    onClick={() => void removeJob(job)}
                    disabled={busyId === job.id}
                    className="rounded border border-alert/30 px-3 py-1.5 text-xs text-alert hover:bg-alert/5 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
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