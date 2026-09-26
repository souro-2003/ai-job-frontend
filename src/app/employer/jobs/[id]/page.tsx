"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, ChevronDown, ChevronUp } from "lucide-react";
import api, { formatSalary, timeAgo } from "@/lib/api";
import type { ApplicationStatus, Pagination, ResumeContent } from "@/types";

interface Applicant {
  id: string;
  status: ApplicationStatus;
  matchScore: number;
  coverLetter: string | null;
  employerNote: string | null;
  createdAt: string;
  resume: {
    id: string;
    title: string;
    pdfUrl: string | null;
    content: ResumeContent;
  } | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    candidateProfile: {
      headline: string | null;
      city: string | null;
      state: string | null;
      experienceYears: number;
      experienceLevel: string;
      currentTitle: string | null;
      expectedSalary: number | null;
      noticePeriodDays: number | null;
      profileScore: number;
      skills: Array<{ proficiency: number; skill: { name: string } }>;
    } | null;
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

function scoreStyle(total: number): string {
  if (total >= 70) return "bg-fit-soft text-fit";
  if (total >= 45) return "bg-locked-soft text-locked";
  return "bg-shell text-ink-soft";
}

export default function JobApplicantsPage() {
  const params = useParams<{ id: string }>();

  const [job, setJob] = useState<{ id: string; title: string } | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [sort, setSort] = useState("match");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get(`/applications/job/${params.id}`, {
        params: { sort, page },
      });
      setJob(data.job);
      setApplicants(data.applications);
      setPagination(data.pagination);
    } catch {
      setError("Could not load applicants for this job.");
    } finally {
      setLoading(false);
    }
  }, [params.id, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(applicationId: string, status: ApplicationStatus) {
    await api.patch(`/applications/${applicationId}/status`, { status });
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/employer/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} />
        Your jobs
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-ink">{job?.title ?? "Applicants"}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {pagination ? `${pagination.total} applicants` : "\u00A0"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/employer/jobs/${params.id}/edit`}
            className="rounded border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-shell"
          >
            Edit job
          </Link>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="match">Best match first</option>
            <option value="recent">Newest first</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-card border border-line bg-paper p-10 text-center text-sm text-ink-soft">
            Loading…
          </div>
        ) : applicants.length === 0 ? (
          <div className="rounded-card border border-line bg-paper p-10 text-center">
            <p className="text-sm text-ink">No applicants yet.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Candidates see this job in search and in their recommendations.
            </p>
          </div>
        ) : (
          applicants.map((applicant) => {
            const profile = applicant.user.candidateProfile;
            const isOpen = expanded === applicant.id;

            return (
              <div
                key={applicant.id}
                className="rounded-card border border-line bg-paper"
              >
                <div className="flex items-start justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <h3 className="text-base font-600 text-ink">
                      {applicant.user.fullName}
                    </h3>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {profile?.currentTitle || profile?.headline || "No title set"}
                      {profile?.city ? ` · ${profile.city}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {profile?.experienceYears ?? 0} yrs experience
                      {profile?.expectedSalary
                        ? ` · expects ${formatSalary(profile.expectedSalary, null)}`
                        : ""}
                      {profile?.noticePeriodDays !== null &&
                      profile?.noticePeriodDays !== undefined
                        ? ` · ${profile.noticePeriodDays} days notice`
                        : ""}
                    </p>
                  </div>

                  <div
                    className={`shrink-0 rounded px-2.5 py-1 text-sm font-600 ${scoreStyle(applicant.matchScore)}`}
                  >
                    {applicant.matchScore}% fit
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
                  <select
                    value={applicant.status}
                    onChange={(e) =>
                      setStatus(applicant.id, e.target.value as ApplicationStatus)
                    }
                    className="rounded border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>

                  <Link
                    href={`mailto:${applicant.user.email}`}
                    className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:bg-shell"
                  >
                    <Mail size={14} />
                    Email
                  </Link>

                  {applicant.user.phone && (
                    <Link
                      href={`tel:${applicant.user.phone}`}
                      className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:bg-shell"
                    >
                      <Phone size={14} />
                      {applicant.user.phone}
                    </Link>
                  )}

                  <button
                    onClick={() => setExpanded(isOpen ? null : applicant.id)}
                    className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:bg-shell"
                  >
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isOpen ? "Hide details" : "View details"}
                  </button>

                  <span className="ml-auto text-xs text-ink-faint">
                    Applied {timeAgo(applicant.createdAt)}
                  </span>
                </div>

                {isOpen && (
                  <div className="border-t border-line px-5 py-4">
                    {profile && profile.skills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-600 text-ink">Skills</h4>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {profile.skills.map((item, i) => (
                            <span
                              key={i}
                              className="rounded bg-shell px-2 py-0.5 text-sm text-ink-soft"
                            >
                              {item.skill.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {applicant.coverLetter && (
                      <div className="mt-4">
                        <h4 className="text-sm font-600 text-ink">Cover letter</h4>
                        <p className="mt-1.5 whitespace-pre-line text-sm text-ink-soft">
                          {applicant.coverLetter}
                        </p>
                      </div>
                    )}

                    {applicant.resume?.content?.summary && (
                      <div className="mt-4">
                        <h4 className="text-sm font-600 text-ink">Resume summary</h4>
                        <p className="mt-1.5 text-sm text-ink-soft">
                          {applicant.resume.content.summary}
                        </p>
                      </div>
                    )}

                    {applicant.resume?.content?.experience &&
                      applicant.resume.content.experience.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-600 text-ink">Work history</h4>
                          <ul className="mt-1.5 space-y-1.5">
                            {applicant.resume.content.experience.map((item, i) => (
                              <li key={i} className="text-sm text-ink-soft">
                                <span className="text-ink">{item.title}</span> at{" "}
                                {item.company}
                                {item.startDate
                                  ? ` (${item.startDate} — ${item.isCurrent ? "present" : item.endDate || "present"})`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {profile && (
                      <p className="mt-4 text-xs text-ink-faint">
                        Profile {profile.profileScore}% complete
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
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