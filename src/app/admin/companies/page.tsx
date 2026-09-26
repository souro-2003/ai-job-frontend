"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Ban, RotateCcw, BadgeCheck, ExternalLink } from "lucide-react";
import api, { timeAgo } from "@/lib/api";
import type { CompanyStatus, Pagination } from "@/types";

interface AdminCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  city: string | null;
  state: string | null;
  status: CompanyStatus;
  isVerified: boolean;
  createdAt: string;
  owner: { id: string; fullName: string; email: string; phone: string | null };
  _count: { jobs: number };
}

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
];

const STATUS_STYLE: Record<CompanyStatus, string> = {
  PENDING: "bg-locked-soft text-locked",
  APPROVED: "bg-fit-soft text-fit",
  SUSPENDED: "bg-alert/10 text-alert",
};

function AdminCompaniesInner() {
  const params = useSearchParams();

  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/companies", {
        params: { status: status || undefined, page },
      });
      setCompanies(data.companies);
      setPagination(data.pagination);
    } catch {
      setError("Could not load companies.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(
    id: string,
    next: CompanyStatus,
    isVerified?: boolean
  ) {
    setBusy(id);

    try {
      const { data } = await api.patch(`/admin/companies/${id}/status`, {
        status: next,
        ...(isVerified !== undefined ? { isVerified } : {}),
      });

      setCompanies((prev) =>
        prev.map((company) =>
          company.id === id
            ? {
                ...company,
                status: data.company.status,
                isVerified: data.company.isVerified,
              }
            : company
        )
      );
    } catch {
      setError("Could not update that company.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl text-ink">Companies</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Approving a company makes its jobs visible to candidates.
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

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-card border border-line bg-paper p-10 text-center text-sm text-ink-soft">
            Loading…
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-card border border-line bg-paper p-10 text-center">
            <p className="text-sm text-ink">Nothing here.</p>
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="rounded-card border border-line bg-paper"
            >
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-600 text-ink">{company.name}</h3>
                    {company.isVerified && (
                      <BadgeCheck size={15} className="text-fit" />
                    )}
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[company.status]}`}
                    >
                      {company.status.charAt(0) +
                        company.status.slice(1).toLowerCase()}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-ink-soft">
                    {company.industry || "Industry not set"}
                    {company.size ? ` · ${company.size} people` : ""}
                    {company.city ? ` · ${company.city}` : ""}
                  </p>

                  <p className="mt-1.5 text-sm text-ink-soft">
                    Owner: {company.owner.fullName} · {company.owner.email}
                    {company.owner.phone ? ` · ${company.owner.phone}` : ""}
                  </p>

                  <p className="mt-1 text-xs text-ink-faint">
                    Registered {timeAgo(company.createdAt)} · {company._count.jobs}{" "}
                    jobs posted
                  </p>

                  {company.website && (
                    <Link
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                    >
                      {company.website}
                      <ExternalLink size={13} />
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                {company.status !== "APPROVED" && (
                  <button
                    onClick={() => updateStatus(company.id, "APPROVED")}
                    disabled={busy === company.id}
                    className="inline-flex items-center gap-1.5 rounded bg-fit px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
                  >
                    <Check size={14} />
                    Approve
                  </button>
                )}

                {company.status === "APPROVED" && !company.isVerified && (
                  <button
                    onClick={() => updateStatus(company.id, "APPROVED", true)}
                    disabled={busy === company.id}
                    className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-shell disabled:opacity-60"
                  >
                    <BadgeCheck size={14} />
                    Mark verified
                  </button>
                )}

                {company.status === "APPROVED" && company.isVerified && (
                  <button
                    onClick={() => updateStatus(company.id, "APPROVED", false)}
                    disabled={busy === company.id}
                    className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-shell disabled:opacity-60"
                  >
                    Remove verified badge
                  </button>
                )}

                {company.status !== "SUSPENDED" && (
                  <button
                    onClick={() => updateStatus(company.id, "SUSPENDED")}
                    disabled={busy === company.id}
                    className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm text-ink-faint hover:text-alert disabled:opacity-60"
                  >
                    <Ban size={14} />
                    Suspend
                  </button>
                )}

                {company.status === "SUSPENDED" && (
                  <button
                    onClick={() => updateStatus(company.id, "PENDING")}
                    disabled={busy === company.id}
                    className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-shell disabled:opacity-60"
                  >
                    <RotateCcw size={14} />
                    Move back to pending
                  </button>
                )}
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

export default function AdminCompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-ink-soft">
          Loading…
        </div>
      }
    >
      <AdminCompaniesInner />
    </Suspense>
  );
}