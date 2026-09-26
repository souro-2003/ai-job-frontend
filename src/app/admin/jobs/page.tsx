"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import api, { timeAgo } from "@/lib/api";
import type { CompanyStatus, Pagination } from "@/types";

interface AdminJob {
  id: string;
  title: string;
  slug: string;
  jobType: string;
  city: string | null;
  isActive: boolean;
  views: number;
  createdAt: string;
  company: { id: string; name: string; status: CompanyStatus };
  _count: { applications: number };
}

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/jobs", { params: { page } });
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch {
      setError("Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl text-ink">Jobs</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every job posted, across all companies.
        {pagination ? ` ${pagination.total} total.` : ""}
      </p>

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
            No jobs posted yet.
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-paper p-5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-600 text-ink">{job.title}</h3>

                  {!job.isActive && (
                    <span className="rounded bg-shell px-2 py-0.5 text-xs text-ink-soft">
                      Closed
                    </span>
                  )}

                  {job.company.status !== "APPROVED" && (
                    <span className="rounded bg-locked-soft px-2 py-0.5 text-xs font-medium text-locked">
                      Company {job.company.status.toLowerCase()} — hidden
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-ink-soft">
                  {job.company.name} ·{" "}
                  {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
                  {job.city ? ` · ${job.city}` : ""}
                </p>

                <p className="mt-1 text-xs text-ink-faint">
                  Posted {timeAgo(job.createdAt)} · {job.views} views
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-600 text-ink">
                    {job._count.applications}
                  </div>
                  <div className="text-xs text-ink-faint">applicants</div>
                </div>

                <Link
                  href={`/jobs/${job.slug}`}
                  className="rounded border border-line p-2 text-ink-faint hover:bg-shell hover:text-ink"
                  title="View as candidate"
                >
                  <ExternalLink size={15} />
                </Link>
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