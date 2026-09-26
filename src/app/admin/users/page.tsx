"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Ban, Check } from "lucide-react";
import api, { timeAgo } from "@/lib/api";
import type { Pagination, Role, SubscriptionStatus, PlanTier } from "@/types";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  subscription: {
    status: SubscriptionStatus;
    expiresAt: string | null;
    plan: { tier: PlanTier; name: string };
  } | null;
  _count: { applications: number; resumes: number };
}

const ROLE_FILTERS = [
  { value: "", label: "All" },
  { value: "CANDIDATE", label: "Candidates" },
  { value: "EMPLOYER", label: "Employers" },
  { value: "ADMIN", label: "Admins" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/users", {
        params: { role: role || undefined, search: query || undefined, page },
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [role, query, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(id: string) {
    setBusy(id);

    try {
      const { data } = await api.patch(`/admin/users/${id}/toggle`);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, isActive: data.user.isActive } : user
        )
      );
    } catch {
      setError("Could not update that user.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl text-ink">Users</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Everyone registered on the portal, and what they are paying.
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
            placeholder="Name or email"
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

      <div className="mt-3 flex flex-wrap gap-2">
        {ROLE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setRole(filter.value);
              setPage(1);
            }}
            className={`rounded border px-3 py-1.5 text-sm ${
              role === filter.value
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
        ) : users.length === 0 ? (
          <div className="bg-paper p-10 text-center text-sm text-ink">
            No users match this search.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-paper p-5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-600 text-ink">{user.fullName}</h3>
                  <span className="rounded bg-shell px-2 py-0.5 text-xs text-ink-soft">
                    {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                  </span>
                  {!user.isActive && (
                    <span className="rounded bg-alert/10 px-2 py-0.5 text-xs text-alert">
                      Disabled
                    </span>
                  )}
                  {user.subscription?.status === "ACTIVE" && (
                    <span className="rounded bg-fit-soft px-2 py-0.5 text-xs font-medium text-fit">
                      {user.subscription.plan.name}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-ink-soft">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ""}
                </p>

                <p className="mt-1 text-xs text-ink-faint">
                  Joined {timeAgo(user.createdAt)}
                  {user.lastLoginAt
                    ? ` · last seen ${timeAgo(user.lastLoginAt)}`
                    : " · never logged in"}
                  {user.role === "CANDIDATE" &&
                    ` · ${user._count.resumes} resumes · ${user._count.applications} applications`}
                  {user.subscription?.expiresAt &&
                    user.subscription.status === "ACTIVE" &&
                    ` · plan ends ${new Date(user.subscription.expiresAt).toLocaleDateString("en-IN")}`}
                </p>
              </div>

              {user.role !== "ADMIN" && (
                <button
                  onClick={() => toggle(user.id)}
                  disabled={busy === user.id}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded border px-3 py-1.5 text-sm disabled:opacity-60 ${
                    user.isActive
                      ? "border-line text-ink-faint hover:text-alert"
                      : "border-fit text-fit hover:bg-fit-soft"
                  }`}
                >
                  {user.isActive ? <Ban size={14} /> : <Check size={14} />}
                  {user.isActive ? "Disable" : "Enable"}
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