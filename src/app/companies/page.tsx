"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Building2, BadgeCheck } from "lucide-react";
import api from "@/lib/api";
import type { Company, Pagination } from "@/types";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/companies", {
        params: { search: query || undefined, page },
      });
      setCompanies(data.companies);
      setPagination(data.pagination);
    } catch {
      setError("Could not load companies.");
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl text-ink">Companies hiring</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every approved employer on the portal.
        {pagination ? ` ${pagination.total} listed.` : ""}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
          setPage(1);
        }}
        className="mt-5 flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Company name or industry"
            className="w-full rounded border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
        >
          Search
        </button>
      </form>

      {error && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {loading ? (
          <div className="rounded-card border border-line bg-paper p-10 text-center text-sm text-ink-soft sm:col-span-2">
            Loading…
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-card border border-line bg-paper p-10 text-center sm:col-span-2">
            <Building2 size={24} className="mx-auto text-ink-faint" />
            <p className="mt-3 text-sm text-ink">
              {query ? "No companies match that search." : "No companies yet."}
            </p>
          </div>
        ) : (
          companies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.slug}`}
              className="rounded-card border border-line bg-paper p-5 hover:bg-shell/60"
            >
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-600 text-ink">
                  {company.name}
                </h2>
                {company.isVerified && (
                  <BadgeCheck size={15} className="shrink-0 text-fit" />
                )}
              </div>

              <p className="mt-1 text-sm text-ink-soft">
                {company.industry || "Industry not set"}
                {company.size ? ` · ${company.size} people` : ""}
              </p>

              <p className="mt-1 text-sm text-ink-soft">
                {[company.city, company.state].filter(Boolean).join(", ") ||
                  "Location not set"}
              </p>

              <p className="mt-3 text-sm font-600 text-brand">
                {company._count?.jobs ?? 0} open job
                {company._count?.jobs === 1 ? "" : "s"}
              </p>
            </Link>
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