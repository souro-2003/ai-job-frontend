"use client";

import { useEffect, useState } from "react";
import { Building2, Clock, CheckCircle2 } from "lucide-react";
import api, { ApiError } from "@/lib/api";
import type { Company } from "@/types";

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export default function EmployerCompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    website: "",
    industry: "",
    size: "",
    about: "",
    city: "",
    state: "",
    logoUrl: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/companies/me");
        const c: Company = data.company;
        setCompany(c);
        setForm({
          name: c.name,
          website: c.website ?? "",
          industry: c.industry ?? "",
          size: c.size ?? "",
          about: c.about ?? "",
          city: c.city ?? "",
          state: c.state ?? "",
          logoUrl: c.logoUrl ?? "",
        });
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          setError("Could not load your company.");
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Company name is needed.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      name: form.name,
      website: form.website || undefined,
      industry: form.industry || undefined,
      size: form.size || undefined,
      about: form.about || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      logoUrl: form.logoUrl || undefined,
    };

    try {
      const { data } = company
        ? await api.put("/companies/me", payload)
        : await api.post("/companies", payload);

      setCompany(data.company);
      setMessage(data.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  const inputClass =
    "w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";
  const labelClass = "mb-1 block text-xs text-ink-faint";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl text-ink">
        {company ? "Your company" : "Set up your company"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {company
          ? "Candidates see this on every job you post."
          : "An admin approves new companies before your jobs go live."}
      </p>

      {company && (
        <div
          className={`mt-5 flex items-start gap-3 rounded-card border p-4 ${
            company.status === "APPROVED"
              ? "border-fit/30 bg-fit-soft"
              : company.status === "SUSPENDED"
                ? "border-alert/30 bg-alert/5"
                : "border-locked/30 bg-locked-soft"
          }`}
        >
          {company.status === "APPROVED" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-fit" />
          ) : (
            <Clock size={18} className="mt-0.5 shrink-0 text-locked" />
          )}
          <div>
            <p className="text-sm font-600 text-ink">
              {company.status === "APPROVED"
                ? "Approved — your jobs are visible to candidates"
                : company.status === "SUSPENDED"
                  ? "Suspended — contact support"
                  : "Waiting for admin approval"}
            </p>
            {company.status === "PENDING" && (
              <p className="mt-0.5 text-sm text-ink-soft">
                You can fill in details now. Posting jobs unlocks once approved.
              </p>
            )}
          </div>
        </div>
      )}

      {message && (
        <p className="mt-5 rounded border border-fit/30 bg-fit-soft px-3 py-2 text-sm text-fit">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <form
        onSubmit={submit}
        noValidate
        className="mt-6 rounded-card border border-line bg-paper p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Company name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="SL Brothers Ltd"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Website</label>
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Industry</label>
            <input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Software"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Company size</label>
            <select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className={inputClass}
            >
              <option value="">Select</option>
              {SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} people
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Logo URL</label>
            <input
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://…/logo.png"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Kolkata"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>State</label>
            <input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="West Bengal"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>About the company</label>
            <textarea
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              rows={5}
              placeholder="What the company does, and what it is like to work there."
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
        >
          <Building2 size={15} />
          {saving
            ? "Saving…"
            : company
              ? "Save changes"
              : "Create company"}
        </button>
      </form>
    </div>
  );
}