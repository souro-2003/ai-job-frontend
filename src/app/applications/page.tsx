"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Briefcase } from "lucide-react";
import api, { formatSalary, timeAgo } from "@/lib/api";
import type { Application, ApplicationStatus, Pagination } from "@/types";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  VIEWED: "Viewed by employer",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  REJECTED: "Not selected",
  HIRED: "Hired",
};

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  APPLIED: "bg-shell text-ink-soft",
  VIEWED: "bg-shell text-ink",
  SHORTLISTED: "bg-fit-soft text-fit",
  INTERVIEW: "bg-fit-soft text-fit",
  REJECTED: "bg-alert/10 text-alert",
  HIRED: "bg-fit text-paper",
};

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "APPLIED", label: "Applied" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "REJECTED", label: "Not selected" },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/applications/mine", {
        params: { page, status: status || undefined },
      });
      setApplications(data.applications);
      setPagination(data.pagination);
    } catch {
      setError("Could not load your applications.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function withdraw(id: string) {
    await api.delete(`/applications/${id}`);
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl text-ink">Your applications</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Track what you have sent and where each one stands.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            className={`rounded border px-3 py-1.5 text-sm ${
              status === filter.value
                ? "border-brand bg-brand text-paper"
                : "border-line bg-paper text-ink-soft hover:bg-shell"
            }`}
          >
            {filter.label}
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
        ) : applications.length === 0 ? (
          <div className="bg-paper p-10 text-center">
            <Briefcase size={24} className="mx-auto text-ink-faint" />
            <p className="mt-3 text-sm text-ink">
              {status ? "Nothing in this category." : "You have not applied anywhere yet."}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Find roles that fit your profile and apply from the job page.
            </p>
            <Link
              href="/jobs"
              className="mt-4 inline-block rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
            >
              Browse jobs
            </Link>
          </div>
        ) : (
          applications.map((application) => (
            <div
              key={application.id}
              className="border-b border-line bg-paper p-5 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/jobs/${application.job.slug}`}
                    className="truncate text-base font-600 text-ink hover:underline"
                  >
                    {application.job.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {application.job.company.name}
                    {" · "}
                    {application.job.isRemote
                      ? "Remote"
                      : application.job.city || "Location not set"}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[application.status]}`}
                >
                  {STATUS_LABEL[application.status]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
                <span>
                  {formatSalary(
                    application.job.salaryMin,
                    application.job.salaryMax
                  )}
                </span>
                {application.matchScore > 0 && (
                  <span className="text-fit">{application.matchScore}% fit</span>
                )}
                <span className="text-ink-faint">
                  Applied {timeAgo(application.createdAt)}
                </span>
                {!application.job.isActive && (
                  <span className="text-locked">Job closed</span>
                )}
              </div>

              {application.employerNote && (
                <p className="mt-3 rounded border border-line bg-shell px-3 py-2 text-sm text-ink-soft">
                  Note from employer: {application.employerNote}
                </p>
              )}

              {(application.status === "APPLIED" ||
                application.status === "VIEWED") && (
                <button
                  onClick={() => withdraw(application.id)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-alert"
                >
                  <Trash2 size={14} />
                  Withdraw
                </button>
              )}
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