"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2, Briefcase, PartyPopper, ExternalLink } from "lucide-react";
import api, { formatSalary, timeAgo } from "@/lib/api";
import type { Application, ApplicationStatus, Pagination } from "@/types";

/** The ordered journey an application travels through. */
const JOURNEY: ApplicationStatus[] = [
  "APPLIED",
  "VIEWED",
  "SHORTLISTED",
  "INTERVIEW",
  "HIRED",
];

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
  { value: "VIEWED", label: "Viewed" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Not selected" },
];

/** How far along the journey a status sits; -1 means the track ended early. */
function stageIndex(status: ApplicationStatus): number {
  if (status === "REJECTED") return -1;
  return JOURNEY.indexOf(status);
}

function scoreStyle(total: number): string {
  if (total >= 70) return "text-fit";
  if (total >= 45) return "text-locked";
  return "text-ink-soft";
}

/** Five-step rail showing where this application stands. */
function StageRail({ status }: { status: ApplicationStatus }) {
  const reached = stageIndex(status);
  const closed = status === "REJECTED";

  return (
    <div className="flex items-center gap-1" title={STATUS_LABEL[status]}>
      {JOURNEY.map((stage, i) => {
        const done = !closed && i <= reached;
        const isHired = done && stage === "HIRED";

        return (
          <span
            key={stage}
            className={`h-1.5 rounded-full transition-all ${
              i === reached && !closed ? "w-7" : "w-4"
            } ${
              closed
                ? "bg-alert/25"
                : isHired
                  ? "bg-fit"
                  : done
                    ? "bg-brand"
                    : "bg-shell"
            }`}
          />
        );
      })}
    </div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Counts for every status, so the filter chips stay honest while filtered.
  const [totals, setTotals] = useState<Partial<Record<ApplicationStatus, number>>>({});
  const [allTotal, setAllTotal] = useState(0);
  const [summarySource, setSummarySource] = useState<Application[]>([]);

  // The dashboard funnel links here with ?status=SHORTLISTED and the like.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("status");
    if (param && FILTERS.some((f) => f.value === param)) setStatus(param);
  }, []);

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

  /** One unfiltered pull drives the chips and the stats panel. */
  const loadSummary = useCallback(async () => {
    try {
      const { data } = await api.get("/applications/mine", {
        params: { limit: 50 },
      });

      const rows: Application[] = data.applications ?? [];
      const counts: Partial<Record<ApplicationStatus, number>> = {};
      for (const a of rows) counts[a.status] = (counts[a.status] ?? 0) + 1;

      setTotals(counts);
      setAllTotal(data.pagination?.total ?? rows.length);
      setSummarySource(rows);
    } catch {
      setTotals({});
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  async function withdraw(id: string) {
    if (!window.confirm("Withdraw this application? The employer loses access to it.")) {
      return;
    }

    setBusyId(id);

    try {
      await api.delete(`/applications/${id}`);
      await Promise.all([load(), loadSummary()]);
    } catch {
      setError("Could not withdraw that application.");
    } finally {
      setBusyId(null);
    }
  }

  const sorted = useMemo(() => {
    const rows = [...applications];

    if (sort === "match") return rows.sort((a, b) => b.matchScore - a.matchScore);
    if (sort === "stage")
      return rows.sort((a, b) => stageIndex(b.status) - stageIndex(a.status));

    return rows;
  }, [applications, sort]);

  /** Honest signals a candidate actually cares about. */
  const stats = useMemo(() => {
    const total = summarySource.length;
    if (total === 0) return null;

    const heard = summarySource.filter((a) => a.status !== "APPLIED").length;
    const advanced = summarySource.filter((a) =>
      ["SHORTLISTED", "INTERVIEW", "HIRED"].includes(a.status)
    ).length;
    const live = summarySource.filter(
      (a) => a.status !== "REJECTED" && a.status !== "HIRED"
    ).length;
    const avgFit = Math.round(
      summarySource.reduce((sum, a) => sum + a.matchScore, 0) / total
    );

    return {
      live,
      heardPct: Math.round((heard / total) * 100),
      advancedPct: Math.round((advanced / total) * 100),
      avgFit,
    };
  }, [summarySource]);

  /** Where the strongest responses came from. */
  const topCompanies = useMemo(() => {
    const tally = new Map<string, number>();

    for (const a of summarySource) {
      const name = a.job.company?.name ?? a.job.companyName ?? "Direct listing";
      tally.set(name, (tally.get(name) ?? 0) + 1);
    }

    return [...tally.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [summarySource]);

  const hiredCount = totals.HIRED ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      {/* ---------------- filter chips ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => {
            const count =
              filter.value === ""
                ? allTotal
                : totals[filter.value as ApplicationStatus] ?? 0;
            const active = status === filter.value;

            return (
              <button
                key={filter.value}
                onClick={() => {
                  setStatus(filter.value);
                  setPage(1);
                }}
                className={`rounded border px-3 py-1.5 text-sm ${
                  active
                    ? "border-brand bg-brand text-paper"
                    : "border-line bg-paper text-ink-soft hover:bg-shell hover:text-ink"
                }`}
              >
                {filter.label}
                <span className={active ? "ml-1.5 opacity-70" : "ml-1.5 text-ink-faint"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="recent">Newest first</option>
          <option value="stage">Furthest along</option>
          <option value="match">Best fit</option>
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {/* ---------------- list + side panel ---------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-card border border-line">
          {loading ? (
            <div className="bg-paper p-10 text-center text-sm text-ink-soft">
              Loading…
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-paper p-12 text-center">
              <Briefcase size={24} className="mx-auto text-ink-faint" />
              <p className="mt-3 text-sm text-ink">
                {status
                  ? "Nothing at this stage yet."
                  : "You have not applied anywhere yet."}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {status
                  ? "Applications move here as employers review them."
                  : "Find a role that fits and send your resume from the job page."}
              </p>
              <Link
                href="/jobs"
                className="mt-4 inline-block rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
              >
                Browse jobs
              </Link>
            </div>
          ) : (
            sorted.map((application) => {
              const company =
                application.job.company?.name ??
                application.job.companyName ??
                "Direct listing";
              const isHired = application.status === "HIRED";

              return (
                <div
                  key={application.id}
                  className={`border-b border-line p-5 last:border-b-0 ${
                    isHired ? "bg-fit-soft/40" : "bg-paper"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/jobs/${application.job.slug}`}
                          className="font-display text-base font-600 text-ink hover:underline"
                        >
                          {application.job.title}
                        </Link>
                        {isHired && <PartyPopper size={15} className="text-fit" />}
                      </div>

                      <p className="mt-0.5 text-sm text-ink-soft">
                        {company}
                        {" · "}
                        {application.job.isRemote
                          ? "Remote"
                          : application.job.city || "Location not set"}
                        {" · "}
                        {formatSalary(
                          application.job.salaryMin,
                          application.job.salaryMax
                        )}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <StageRail status={application.status} />

                        <span className="text-xs text-ink-faint">
                          Applied {timeAgo(application.createdAt)}
                        </span>

                        {application.matchScore > 0 && (
                          <span className={`text-xs ${scoreStyle(application.matchScore)}`}>
                            {application.matchScore}% fit
                          </span>
                        )}

                        {!application.job.isActive && (
                          <span className="text-xs text-locked">
                            Job closed by employer
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[application.status]}`}
                      >
                        {STATUS_LABEL[application.status]}
                      </span>

                      <div className="flex items-center gap-1">
                        <Link
                          href={`/jobs/${application.job.slug}`}
                          title="Open the job"
                          className="rounded border border-line p-1.5 text-ink-faint hover:bg-shell hover:text-ink"
                        >
                          <ExternalLink size={14} />
                        </Link>

                        {(application.status === "APPLIED" ||
                          application.status === "VIEWED") && (
                          <button
                            onClick={() => void withdraw(application.id)}
                            disabled={busyId === application.id}
                            title="Withdraw"
                            className="rounded border border-line p-1.5 text-ink-faint hover:bg-alert/5 hover:text-alert disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {application.employerNote && (
                    <p className="mt-3 rounded border border-line bg-shell px-3 py-2 text-sm text-ink-soft">
                      From the employer: {application.employerNote}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ---------------- side panel ---------------- */}
        <aside className="space-y-4">
          {hiredCount > 0 && (
            <div className="rounded-card border border-fit/30 bg-fit-soft p-5 text-center">
              <PartyPopper size={22} className="mx-auto text-fit" />
              <p className="mt-2 text-sm font-600 text-ink">
                {hiredCount === 1
                  ? "You have an offer"
                  : `${hiredCount} offers in hand`}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Open the job to see the details and reply.
              </p>
            </div>
          )}

          {stats ? (
            <div className="rounded-card border border-line bg-paper p-5">
              <h2 className="text-sm font-600 text-ink">How your search is going</h2>

              <dl className="mt-4 space-y-3.5">
                <div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-sm text-ink-soft">Heard back</dt>
                    <dd className="font-display text-lg font-600 text-ink">
                      {stats.heardPct}%
                    </dd>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-shell">
                    <div className="h-full bg-brand" style={{ width: `${stats.heardPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-sm text-ink-soft">Reached shortlist</dt>
                    <dd className="font-display text-lg font-600 text-ink">
                      {stats.advancedPct}%
                    </dd>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-shell">
                    <div className="h-full bg-fit" style={{ width: `${stats.advancedPct}%` }} />
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-line pt-3">
                  <dt className="text-sm text-ink-soft">Still in play</dt>
                  <dd className="font-display text-lg font-600 text-ink">{stats.live}</dd>
                </div>

                <div className="flex items-baseline justify-between">
                  <dt className="text-sm text-ink-soft">Average fit</dt>
                  <dd className={`font-display text-lg font-600 ${scoreStyle(stats.avgFit)}`}>
                    {stats.avgFit}%
                  </dd>
                </div>
              </dl>

              {stats.avgFit < 60 && (
                <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft">
                  You are applying below your match range. Roles above 60% hear back
                  far more often.
                </p>
              )}
            </div>
          ) : null}

          {topCompanies.length > 0 && (
            <div className="rounded-card border border-line bg-paper p-5">
              <h2 className="text-sm font-600 text-ink">Companies you keep applying to</h2>

              <ul className="mt-3 space-y-2">
                {topCompanies.map(([name, count]) => (
                  <li key={name} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-ink">{name}</span>
                    <span className="shrink-0 rounded bg-shell px-2 py-0.5 text-xs text-ink-soft">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-card border border-line bg-paper p-5">
            <h2 className="text-sm font-600 text-ink">Keep the pipeline moving</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {stats && stats.live === 0
                ? "Nothing is live right now. Send a few more applications this week."
                : "Candidates who apply to five roles a week hear back the most."}
            </p>
            <Link
              href="/jobs"
              className="mt-3 block rounded bg-brand px-4 py-2 text-center text-sm font-medium text-paper hover:bg-brand-deep"
            >
              Find more jobs
            </Link>
          </div>
        </aside>
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