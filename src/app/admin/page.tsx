"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle, Plus } from "lucide-react";
import api, { formatPaise } from "@/lib/api";

interface Dashboard {
  users: {
    total: number;
    candidates: number;
    employers: number;
    newLast30Days: number;
    newToday: number;
  };
  companies: { total: number; approved: number; pending: number };
  jobs: { total: number; active: number };
  applications: { total: number; last7Days: number };
  resumes: { total: number };
  revenue: {
    totalInPaise: number;
    last30DaysInPaise: number;
    activeSubscriptions: number;
    conversionRate: number;
  };
}

interface TopAction {
  action: string;
  count: number;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [actions, setActions] = useState<TopAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [dashboardRes, trafficRes] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/admin/traffic", { params: { days: 30 } }),
        ]);
        setData(dashboardRes.data);
        setActions(trafficRes.data.topActions);
      } catch {
        setError("Could not load the dashboard.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-sm text-alert">{error || "No data."}</p>
      </div>
    );
  }

  const maxCount = Math.max(...actions.map((a) => a.count), 1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">Overview</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Everything happening on the portal right now.
          </p>
        </div>

        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          <Plus size={16} />
          Add job
        </Link>
      </div>

      {data.companies.pending > 0 && (
        <Link
          href="/admin/companies?status=PENDING"
          className="mt-5 flex items-start gap-3 rounded-card border border-locked/30 bg-locked-soft p-4 hover:opacity-90"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-locked" />
          <div className="flex-1">
            <p className="text-sm font-600 text-ink">
              {data.companies.pending} compan
              {data.companies.pending === 1 ? "y is" : "ies are"} waiting for
              approval
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              Their jobs stay hidden from candidates until you approve them.
            </p>
          </div>
          <ArrowRight size={16} className="mt-0.5 shrink-0 text-locked" />
        </Link>
      )}

      {/* People */}
      <section className="mt-6">
        <h2 className="text-sm font-600 text-ink-soft">People</h2>
        <div className="mt-2 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
          <Link href="/admin/users" className="bg-paper p-5 hover:bg-shell/60">
            <div className="text-2xl font-600 text-ink">{data.users.total}</div>
            <div className="mt-0.5 text-sm text-ink-soft">Total users</div>
          </Link>
          <Link href="/admin/users" className="bg-paper p-5 hover:bg-shell/60">
            <div className="text-2xl font-600 text-ink">{data.users.candidates}</div>
            <div className="mt-0.5 text-sm text-ink-soft">Candidates</div>
          </Link>
          <Link href="/admin/users" className="bg-paper p-5 hover:bg-shell/60">
            <div className="text-2xl font-600 text-ink">{data.users.employers}</div>
            <div className="mt-0.5 text-sm text-ink-soft">Employers</div>
          </Link>
          <div className="bg-paper p-5">
            <div className="text-2xl font-600 text-fit">
              +{data.users.newToday}
            </div>
            <div className="mt-0.5 text-sm text-ink-soft">
              Joined today
              <span className="block text-xs text-ink-faint">
                {data.users.newLast30Days} in 30 days
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Hiring */}
      <section className="mt-6">
        <h2 className="text-sm font-600 text-ink-soft">Hiring</h2>
        <div className="mt-2 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
          <Link href="/admin/companies" className="bg-paper p-5 hover:bg-shell/60">
            <div className="text-2xl font-600 text-ink">
              {data.companies.approved}
            </div>
            <div className="mt-0.5 text-sm text-ink-soft">
              Approved companies
              <span className="block text-xs text-locked">
                {data.companies.pending} pending
              </span>
            </div>
          </Link>
          <Link href="/admin/jobs" className="bg-paper p-5 hover:bg-shell/60">
            <div className="text-2xl font-600 text-ink">{data.jobs.active}</div>
            <div className="mt-0.5 text-sm text-ink-soft">
              Open jobs
              <span className="block text-xs text-ink-faint">
                {data.jobs.total} total
              </span>
            </div>
          </Link>
          <Link
            href="/admin/applications"
            className="bg-paper p-5 hover:bg-shell/60"
          >
            <div className="text-2xl font-600 text-ink">
              {data.applications.total}
            </div>
            <div className="mt-0.5 text-sm text-ink-soft">
              Applications
              <span className="block text-xs text-ink-faint">
                {data.applications.last7Days} this week
              </span>
            </div>
          </Link>
          <div className="bg-paper p-5">
            <div className="text-2xl font-600 text-ink">{data.resumes.total}</div>
            <div className="mt-0.5 text-sm text-ink-soft">Resumes built</div>
          </div>
        </div>
      </section>

      {/* Money */}
      <section className="mt-6">
        <h2 className="text-sm font-600 text-ink-soft">Revenue</h2>
        <div className="mt-2 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
          <div className="bg-paper p-5">
            <div className="text-2xl font-600 text-ink">
              {formatPaise(data.revenue.totalInPaise)}
            </div>
            <div className="mt-0.5 text-sm text-ink-soft">All time</div>
          </div>
          <div className="bg-paper p-5">
            <div className="text-2xl font-600 text-ink">
              {formatPaise(data.revenue.last30DaysInPaise)}
            </div>
            <div className="mt-0.5 text-sm text-ink-soft">Last 30 days</div>
          </div>
          <div className="bg-paper p-5">
            <div className="text-2xl font-600 text-ink">
              {data.revenue.activeSubscriptions}
            </div>
            <div className="mt-0.5 text-sm text-ink-soft">Paying users</div>
          </div>
          <div className="bg-paper p-5">
            <div className="text-2xl font-600 text-ink">
              {data.revenue.conversionRate}%
            </div>
            <div className="mt-0.5 text-sm text-ink-soft">
              Candidates who pay
            </div>
          </div>
        </div>
      </section>

      {/* Activity */}
      <section className="mt-6 mb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-600 text-ink-soft">
            What people did in the last 30 days
          </h2>
          <Link href="/admin/activity" className="text-sm text-brand hover:underline">
            Full log
          </Link>
        </div>

        <div className="mt-2 rounded-card border border-line bg-paper p-5">
          {actions.length === 0 ? (
            <p className="text-sm text-ink-soft">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {actions.map((item) => (
                <div key={item.action} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-ink-soft">
                    {item.action.toLowerCase().replace(/_/g, " ")}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-shell">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-sm text-ink">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}