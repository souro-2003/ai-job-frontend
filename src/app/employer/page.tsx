"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Power, Trash2, Users } from "lucide-react";
import api, { formatSalary, timeAgo } from "@/lib/api";
import type { Job } from "@/types";

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/jobs/mine");
      setJobs(data.jobs);
    } catch {
      setError("Could not load your jobs. Create your company first if you have not.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(id: string) {
    const { data } = await api.patch(`/jobs/${id}/toggle`);
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, isActive: data.job.isActive } : job
      )
    );
  }

  async function remove(id: string) {
    await api.delete(`/jobs/${id}`);
    setJobs((prev) => prev.filter((job) => job.id !== id));
  }

  const visible = jobs.filter((job) =>
    filter === "all" ? true : filter === "open" ? job.isActive : !job.isActive
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-ink">Your jobs</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Close a job to stop new applications without deleting what you have.
          </p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="inline-flex items-center gap-1.5 rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
        >
          <Plus size={15} />
          Post a job
        </Link>
      </div>

      <div className="mt-5 flex gap-2">
        {(["all", "open", "closed"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded border px-3 py-1.5 text-sm capitalize ${
              filter === value
                ? "border-brand bg-brand text-paper"
                : "border-line bg-paper text-ink-soft hover:bg-shell"
            }`}
          >
            {value}
          </button>
        ))}
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
        ) : visible.length === 0 ? (
          <div className="bg-paper p-10 text-center">
            <p className="text-sm text-ink">
              {jobs.length === 0
                ? "You have not posted any jobs yet."
                : "Nothing in this view."}
            </p>
            {jobs.length === 0 && (
              <Link
                href="/employer/jobs/new"
                className="mt-4 inline-block rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
              >
                Post your first job
              </Link>
            )}
          </div>
        ) : (
          visible.map((job) => (
            <div
              key={job.id}
              className="border-b border-line bg-paper p-5 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/employer/jobs/${job.id}`}
                      className="truncate text-base font-600 text-ink hover:underline"
                    >
                      {job.title}
                    </Link>
                    {!job.isActive && (
                      <span className="shrink-0 rounded bg-shell px-2 py-0.5 text-xs text-ink-soft">
                        Closed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {job.isRemote ? "Remote" : job.city || "Location not set"} ·{" "}
                    {formatSalary(job.salaryMin, job.salaryMax)} · {job.views} views
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Posted {timeAgo(job.createdAt)}
                    {job.expiresAt
                      ? ` · closes ${new Date(job.expiresAt).toLocaleDateString("en-IN")}`
                      : ""}
                  </p>
                </div>

                <Link
                  href={`/employer/jobs/${job.id}`}
                  className="shrink-0 text-right"
                >
                  <div className="text-lg font-600 text-ink">
                    {job._count?.applications ?? 0}
                  </div>
                  <div className="text-xs text-ink-faint">applicants</div>
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/employer/jobs/${job.id}`}
                  className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:bg-shell"
                >
                  <Users size={14} />
                  View applicants
                </Link>

                <button
                  onClick={() => toggle(job.id)}
                  className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:bg-shell"
                >
                  <Power size={14} />
                  {job.isActive ? "Close job" : "Reopen job"}
                </button>

                <button
                  onClick={() => remove(job.id)}
                  className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-sm text-ink-faint hover:text-alert"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}