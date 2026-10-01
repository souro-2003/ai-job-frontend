"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Mail, Phone, ExternalLink, X, Printer } from "lucide-react";
import api, { timeAgo } from "@/lib/api";
import ResumeTemplate from "@/components/ResumeTemplates";
import type { ApplicationStatus, Pagination, ResumeContent } from "@/types";

interface AdminApplication {
  id: string;
  status: ApplicationStatus;
  matchScore: number;
  coverLetter: string | null;
  employerNote: string | null;
  appliedAt: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    currentTitle: string | null;
    experienceYears: number | null;
    plan: string;
    isPaid: boolean;
  };
  job: {
    id: string;
    title: string;
    slug: string;
    company: string;
    location: string | null;
  };
  resume: string | null;
}

interface ResumeView {
  candidate: { fullName: string; email: string; phone: string | null };
  job: { title: string };
  coverLetter: string | null;
  resume: {
    id: string;
    title: string;
    template: string;
    content: ResumeContent;
    pdfUrl: string | null;
    updatedAt: string;
  };
}

const STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "VIEWED",
  "SHORTLISTED",
  "INTERVIEW",
  "REJECTED",
  "HIRED",
];

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  VIEWED: "Viewed",
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

const TEMPLATE_LABEL: Record<string, string> = {
  classic: "Classic",
  professional: "Professional",
  modern: "Modern",
  minimal: "Minimal",
};

/** Only the resume sheet reaches the printer — not the list, header or cover letter. */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #resume-print-area, #resume-print-area * { visibility: visible !important; }
  #resume-print-area {
    position: absolute !important;
    inset: 0 auto auto 0;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
  }
  @page { margin: 12mm; }
}
`;

function scoreStyle(total: number): string {
  if (total >= 70) return "bg-fit-soft text-fit";
  if (total >= 45) return "bg-locked-soft text-locked";
  return "bg-shell text-ink-soft";
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [resumeView, setResumeView] = useState<ResumeView | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/applications", {
        params: {
          page,
          sort,
          status: status || undefined,
          search: query || undefined,
        },
      });
      setApplications(data.applications);
      setByStatus(data.byStatus ?? {});
      setPagination(data.pagination);
    } catch {
      setError("Could not load applications.");
    } finally {
      setLoading(false);
    }
  }, [page, sort, status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const runSearch = () => {
    setPage(1);
    setQuery(search.trim());
  };

  const changeStatus = async (id: string, next: ApplicationStatus) => {
    setBusyId(id);

    try {
      await api.patch(`/admin/applications/${id}/status`, { status: next });
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: next } : a))
      );
    } catch {
      setError("Could not update that application.");
    } finally {
      setBusyId(null);
    }
  };

  const openResume = async (id: string) => {
    setResumeLoading(true);
    setResumeError("");
    setResumeView(null);

    try {
      const { data } = await api.get(`/admin/applications/${id}/resume`);
      setResumeView(data);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not load the resume.";
      setResumeError(message);
    } finally {
      setResumeLoading(false);
    }
  };

  const total = pagination?.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <style>{PRINT_CSS}</style>

      <h1 className="text-2xl text-ink">Applications</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every application sent on the portal.{total ? ` ${total} total.` : ""}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setPage(1);
              setStatus(status === s ? "" : s);
            }}
            className={`bg-paper p-3 text-left hover:bg-shell ${
              status === s ? "ring-1 ring-inset ring-ink" : ""
            }`}
          >
            <div className="text-lg font-600 text-ink">{byStatus[s] ?? 0}</div>
            <div className="mt-0.5 text-xs text-ink-faint">
              {STATUS_LABEL[s]}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Search candidate, email or job"
          className="min-w-[220px] flex-1 rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <button
          onClick={runSearch}
          className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink hover:bg-shell"
        >
          Search
        </button>

        <select
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value);
          }}
          className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink"
        >
          <option value="recent">Newest first</option>
          <option value="match">Best match first</option>
        </select>

        {status && (
          <button
            onClick={() => {
              setStatus("");
              setPage(1);
            }}
            className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink-soft hover:bg-shell"
          >
            Clear filter
          </button>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {resumeError && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {resumeError}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-card border border-line">
        {loading ? (
          <div className="bg-paper p-10 text-center text-sm text-ink-soft">
            Loading…
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-paper p-10 text-center text-sm text-ink">
            No applications match this filter.
          </div>
        ) : (
          applications.map((a) => (
            <div
              key={a.id}
              className="border-b border-line bg-paper p-5 last:border-b-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-600 text-ink">
                      {a.candidate.name}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        a.candidate.isPaid
                          ? "bg-shell font-medium text-ink"
                          : "text-ink-faint"
                      }`}
                    >
                      {a.candidate.plan}
                    </span>
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                    <a
                      href={`mailto:${a.candidate.email}`}
                      className="inline-flex items-center gap-1 hover:text-ink hover:underline"
                    >
                      <Mail size={13} />
                      {a.candidate.email}
                    </a>
                    {a.candidate.phone && (
                      <a
                        href={`tel:${a.candidate.phone}`}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        <Phone size={13} />
                        {a.candidate.phone}
                      </a>
                    )}
                  </p>

                  {(a.candidate.currentTitle || a.candidate.city) && (
                    <p className="mt-1 text-xs text-ink-faint">
                      {[a.candidate.currentTitle, a.candidate.city]
                        .filter(Boolean)
                        .join(" · ")}
                      {a.candidate.experienceYears != null
                        ? ` · ${a.candidate.experienceYears} yrs`
                        : ""}
                    </p>
                  )}

                  <p className="mt-2 text-sm text-ink">
                    Applied for{" "}
                    <Link
                      href={`/admin/jobs/${a.job.id}`}
                      className="font-medium hover:underline"
                    >
                      {a.job.title}
                    </Link>{" "}
                    <span className="text-ink-soft">
                      at {a.job.company}
                      {a.job.location ? ` · ${a.job.location}` : ""}
                    </span>
                  </p>

                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
                    <span>{timeAgo(a.appliedAt)}</span>
                    <button
                      onClick={() => void openResume(a.id)}
                      disabled={resumeLoading}
                      className="inline-flex items-center gap-1 text-brand hover:underline disabled:opacity-50"
                    >
                      <FileText size={12} />
                      {resumeLoading ? "Opening…" : a.resume ?? "View resume"}
                    </button>
                    <Link
                      href={`/jobs/${a.job.slug}`}
                      className="inline-flex items-center gap-1 hover:text-ink hover:underline"
                    >
                      <ExternalLink size={12} />
                      View job
                    </Link>
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div
                    className={`rounded px-2.5 py-1 text-sm font-600 ${scoreStyle(a.matchScore)}`}
                  >
                    {a.matchScore}% fit
                  </div>

                  <span
                    className={`rounded px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[a.status]}`}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>

                  <select
                    value={a.status}
                    disabled={busyId === a.id}
                    onChange={(e) =>
                      void changeStatus(a.id, e.target.value as ApplicationStatus)
                    }
                    className="rounded border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-40"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(a.coverLetter || a.employerNote) && (
                <button
                  onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  className="mt-3 text-xs text-ink-faint hover:text-ink hover:underline"
                >
                  {openId === a.id ? "Hide" : "Show"} cover letter and notes
                </button>
              )}

              {openId === a.id && (
                <div className="mt-2 space-y-2">
                  {a.coverLetter && (
                    <p className="whitespace-pre-line rounded border border-line bg-shell px-3 py-2 text-sm text-ink-soft">
                      {a.coverLetter}
                    </p>
                  )}
                  {a.employerNote && (
                    <p className="rounded border border-line bg-shell px-3 py-2 text-sm text-ink-soft">
                      Employer note: {a.employerNote}
                    </p>
                  )}
                </div>
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

      {/* ---------------- resume modal ---------------- */}
      {resumeView && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4"
          onClick={() => setResumeView(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-[860px]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-card border border-line bg-paper px-5 py-3">
              <div className="min-w-0">
                <h2 className="text-base font-600 text-ink">
                  {resumeView.resume.title}
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {resumeView.candidate.fullName} · applied for{" "}
                  {resumeView.job.title} ·{" "}
                  {TEMPLATE_LABEL[resumeView.resume.template] ??
                    resumeView.resume.template}{" "}
                  template
                </p>
              </div>

              <div className="flex items-center gap-2">
                {resumeView.resume.pdfUrl && (
                  <a
                    href={resumeView.resume.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border border-line px-3 py-1.5 text-xs text-ink hover:bg-shell"
                  >
                    Saved PDF
                  </a>
                )}
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded border border-line px-3 py-1.5 text-xs text-ink hover:bg-shell"
                >
                  <Printer size={13} />
                  Print
                </button>
                <button
                  onClick={() => setResumeView(null)}
                  className="rounded p-1.5 text-ink-faint hover:bg-shell hover:text-ink"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Only this block is sent to the printer — see PRINT_CSS above. */}
            <div
              id="resume-print-area"
              className="overflow-x-auto bg-white shadow-lg"
            >
              <ResumeTemplate
                template={resumeView.resume.template}
                content={resumeView.resume.content}
              />
            </div>

            {resumeView.coverLetter && (
              <div className="rounded-b-card border border-t-0 border-line bg-paper px-5 py-4">
                <h3 className="text-xs font-600 uppercase tracking-wide text-ink-faint">
                  Cover letter
                </h3>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {resumeView.coverLetter}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}