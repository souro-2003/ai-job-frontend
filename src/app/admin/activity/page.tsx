"use client";

import { useCallback, useEffect, useState } from "react";
import api, { timeAgo } from "@/lib/api";
import type { Pagination, Role } from "@/types";

interface LogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string; role: Role } | null;
}

const ACTION_FILTERS = [
  { value: "", label: "Everything" },
  { value: "SIGNUP", label: "Signups" },
  { value: "LOGIN", label: "Logins" },
  { value: "JOB_VIEW", label: "Job views" },
  { value: "APPLY", label: "Applications" },
  { value: "RESUME_CREATE", label: "Resumes" },
  { value: "PAYMENT_SUCCESS", label: "Payments" },
  { value: "AI_CHAT", label: "AI chats" },
];

const ACTION_STYLE: Record<string, string> = {
  SIGNUP: "bg-fit-soft text-fit",
  PAYMENT_SUCCESS: "bg-fit-soft text-fit",
  APPLY: "bg-fit-soft text-fit",
  PAYMENT_INITIATED: "bg-locked-soft text-locked",
  ADMIN_USER_TOGGLE: "bg-alert/10 text-alert",
  ADMIN_COMPANY_STATUS: "bg-locked-soft text-locked",
};

function readableAction(action: string): string {
  const text = action.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function browserFrom(userAgent: string | null): string {
  if (!userAgent) return "";
  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("Chrome/")) return "Chrome";
  if (userAgent.includes("Firefox/")) return "Firefox";
  if (userAgent.includes("Safari/")) return "Safari";
  return "Other";
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/activity", {
        params: { action: action || undefined, page },
      });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch {
      setError("Could not load the activity log.");
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl text-ink">Activity</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every tracked action, newest first.
        {pagination ? ` ${pagination.total} records.` : ""}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {ACTION_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setAction(filter.value);
              setPage(1);
            }}
            className={`rounded border px-3 py-1.5 text-sm ${
              action === filter.value
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
        ) : logs.length === 0 ? (
          <div className="bg-paper p-10 text-center text-sm text-ink">
            Nothing recorded for this filter yet.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-paper px-5 py-3.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      ACTION_STYLE[log.action] ?? "bg-shell text-ink-soft"
                    }`}
                  >
                    {readableAction(log.action)}
                  </span>

                  {log.user ? (
                    <span className="text-sm text-ink">
                      {log.user.fullName}
                      <span className="text-ink-faint"> · {log.user.email}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-ink-faint">Signed out visitor</span>
                  )}
                </div>

                {log.meta && Object.keys(log.meta).length > 0 && (
                  <p className="mt-1 text-sm text-ink-soft">
                    {Object.entries(log.meta)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(" · ")}
                  </p>
                )}

                <p className="mt-0.5 text-xs text-ink-faint">
                  {log.entity ? `${log.entity} ` : ""}
                  {log.ip ? `· ${log.ip} ` : ""}
                  {browserFrom(log.userAgent)
                    ? `· ${browserFrom(log.userAgent)}`
                    : ""}
                </p>
              </div>

              <span className="shrink-0 text-xs text-ink-faint">
                {timeAgo(log.createdAt)}
              </span>
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