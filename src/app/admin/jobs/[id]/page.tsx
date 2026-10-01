"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, ExternalLink, CheckCircle2 } from "lucide-react";
import api, { timeAgo } from "@/lib/api";

interface CompanyOption {
  id: string;
  name: string;
  city: string | null;
}

interface SkillRow {
  name: string;
  isRequired: boolean;
  weight: number;
}

interface Viewer {
  id: string;
  isAnonymous: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  city: string | null;
  currentTitle: string | null;
  experienceYears: number | null;
  plan: string;
  isPaid: boolean;
  viewCount: number;
  applied: boolean;
  source: string | null;
  referrer: string | null;
  firstSeen: string;
  lastSeen: string;
}

interface ViewerSummary {
  totalViews: number;
  uniqueViewers: number;
  loggedInViewers: number;
  anonymousViewers: number;
  appliedAfterViewing: number;
}

interface Applicant {
  id: string;
  status: string;
  matchScore: number;
  appliedAt: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  resume: string | null;
}

const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "REMOTE", label: "Remote" },
];

const EXP_LEVELS = [
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
];

const TABS = [
  { value: "details", label: "Details" },
  { value: "viewers", label: "Who viewed" },
  { value: "applicants", label: "Applicants" },
];

const labelClass = "block text-sm font-medium text-ink";
const inputClass =
  "mt-1 w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink";
const sectionClass = "rounded-card border border-line bg-paper p-5";

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function dateInput(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function AdminJobDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [tab, setTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [slug, setSlug] = useState("");
  const [postedByAdmin, setPostedByAdmin] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyMode, setCompanyMode] = useState<"manual" | "existing">("manual");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");

  const [jobType, setJobType] = useState("FULL_TIME");
  const [experienceLevel, setExperienceLevel] = useState("JUNIOR");
  const [minExperience, setMinExperience] = useState("0");
  const [maxExperience, setMaxExperience] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [isRemote, setIsRemote] = useState(false);

  const [vacancies, setVacancies] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<SkillRow[]>([]);

  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [summary, setSummary] = useState<ViewerSummary | null>(null);
  const [viewersLoading, setViewersLoading] = useState(false);

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  /* ---------------- load ---------------- */

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get(`/admin/jobs/${jobId}`);
      const j = data.job;

      setSlug(j.slug ?? "");
      setPostedByAdmin(j.postedByAdmin?.fullName ?? null);

      setCompanyMode(j.companyId ? "existing" : "manual");
      setCompanyId(j.companyId ?? "");
      setCompanyName(j.companyName ?? "");
      setCompanyWebsite(j.companyWebsite ?? "");
      setApplyUrl(j.applyUrl ?? "");
      setContactEmail(j.contactEmail ?? "");

      setTitle(j.title ?? "");
      setDescription(j.description ?? "");
      setResponsibilities(j.responsibilities ?? "");
      setRequirements(j.requirements ?? "");

      setJobType(j.jobType ?? "FULL_TIME");
      setExperienceLevel(j.experienceLevel ?? "JUNIOR");
      setMinExperience(String(j.minExperience ?? 0));
      setMaxExperience(j.maxExperience == null ? "" : String(j.maxExperience));
      setSalaryMin(j.salaryMin == null ? "" : String(j.salaryMin));
      setSalaryMax(j.salaryMax == null ? "" : String(j.salaryMax));

      setCity(j.city ?? "");
      setState(j.state ?? "");
      setCountry(j.country ?? "India");
      setIsRemote(Boolean(j.isRemote));

      setVacancies(String(j.vacancies ?? 1));
      setExpiresAt(dateInput(j.expiresAt));
      setIsActive(Boolean(j.isActive));
      setIsFeatured(Boolean(j.isFeatured));

      setSkills(
        (j.skills ?? []).map((s: SkillRow) => ({
          name: s.name,
          isRequired: s.isRequired,
          weight: s.weight,
        }))
      );
    } catch {
      setError("Could not load this job.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
    api
      .get("/admin/job-companies")
      .then(({ data }) => setCompanies(data.companies ?? []))
      .catch(() => setCompanies([]));
  }, [loadJob]);

  useEffect(() => {
    if (tab !== "viewers") return;

    setViewersLoading(true);
    api
      .get(`/admin/jobs/${jobId}/viewers`, { params: { limit: 100 } })
      .then(({ data }) => {
        setViewers(data.viewers ?? []);
        setSummary(data.summary ?? null);
      })
      .catch(() => setError("Could not load viewers."))
      .finally(() => setViewersLoading(false));
  }, [tab, jobId]);

  useEffect(() => {
    if (tab !== "applicants") return;

    setApplicantsLoading(true);
    api
      .get(`/admin/jobs/${jobId}/applicants`)
      .then(({ data }) => setApplicants(data.applicants ?? []))
      .catch(() => setError("Could not load applicants."))
      .finally(() => setApplicantsLoading(false));
  }, [tab, jobId]);

  /* ---------------- skills ---------------- */

  const addSkill = () => {
    const name = skillInput.trim();
    if (!name) return;

    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSkillInput("");
      return;
    }

    setSkills((prev) => [...prev, { name, isRequired: true, weight: 3 }]);
    setSkillInput("");
  };

  const updateSkill = (index: number, patch: Partial<SkillRow>) => {
    setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  /* ---------------- save / delete ---------------- */

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const payload = {
      companyId: companyMode === "existing" ? companyId || null : null,
      companyName: companyMode === "manual" ? companyName.trim() : null,
      companyWebsite: companyWebsite.trim() || null,
      applyUrl: applyUrl.trim() || null,
      contactEmail: contactEmail.trim() || null,

      title: title.trim(),
      description: description.trim(),
      responsibilities: responsibilities.trim() || null,
      requirements: requirements.trim() || null,

      jobType,
      experienceLevel,
      minExperience: toNumber(minExperience) ?? 0,
      maxExperience: toNumber(maxExperience) ?? null,
      salaryMin: toNumber(salaryMin) ?? null,
      salaryMax: toNumber(salaryMax) ?? null,

      city: city.trim() || null,
      state: state.trim() || null,
      country: country.trim() || "India",
      isRemote,

      vacancies: toNumber(vacancies) ?? 1,
      isActive,
      isFeatured,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,

      skills,
    };

    try {
      const { data } = await api.patch(`/admin/jobs/${jobId}`, payload);
      setSlug(data.job?.slug ?? slug);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not save this job.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const removeJob = async () => {
    if (
      !window.confirm(
        `Delete "${title}"? Its applications and view history go with it.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/jobs/${jobId}`);
      router.push("/admin/jobs");
    } catch {
      setError("Could not delete this job.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} />
        Back to jobs
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl text-ink">{title || "Untitled job"}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {postedByAdmin ? `Posted by ${postedByAdmin}` : "Posted by an employer"}
            {isActive ? " · Live" : " · Closed"}
            {isFeatured ? " · Featured" : ""}
          </p>
        </div>

        {slug && (
          <Link
            href={`/jobs/${slug}`}
            className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm text-ink hover:bg-shell"
          >
            <ExternalLink size={15} />
            View as candidate
          </Link>
        )}
      </div>

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              tab === t.value
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {saved && (
        <p className="mt-5 inline-flex items-center gap-2 rounded border border-line bg-shell px-3 py-2 text-sm text-ink">
          <CheckCircle2 size={15} />
          Saved.
        </p>
      )}

      {/* ---------------- DETAILS ---------------- */}
      {tab === "details" && (
        <div className="mt-6 space-y-5">
          <section className={sectionClass}>
            <h2 className="text-sm font-600 uppercase tracking-wide text-ink-soft">
              Company
            </h2>

            <div className="mt-3 flex gap-4 text-sm text-ink">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={companyMode === "manual"}
                  onChange={() => setCompanyMode("manual")}
                />
                Type the company name
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={companyMode === "existing"}
                  onChange={() => setCompanyMode("existing")}
                />
                Pick a registered company
              </label>
            </div>

            {companyMode === "existing" ? (
              <div className="mt-4">
                <label className={labelClass}>Registered company</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? ` — ${c.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Company name</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Website (optional)</label>
                  <input
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>External apply link (optional)</label>
                <input
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact email (optional)</label>
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-sm font-600 uppercase tracking-wide text-ink-soft">
              The role
            </h2>

            <div className="mt-4">
              <label className={labelClass}>Job title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mt-4">
              <label className={labelClass}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-ink-faint">
                {description.trim().length} characters — minimum 30.
              </p>
            </div>

            <div className="mt-4">
              <label className={labelClass}>Responsibilities (optional)</label>
              <textarea
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                rows={4}
                className={inputClass}
              />
            </div>

            <div className="mt-4">
              <label className={labelClass}>Requirements (optional)</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
                className={inputClass}
              />
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-sm font-600 uppercase tracking-wide text-ink-soft">
              Type, experience and pay
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Job type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className={inputClass}
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Experience level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className={inputClass}
                >
                  {EXP_LEVELS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Min experience (years)</label>
                <input
                  type="number"
                  min={0}
                  value={minExperience}
                  onChange={(e) => setMinExperience(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Max experience (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={maxExperience}
                  onChange={(e) => setMaxExperience(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Salary min (₹ per year)</label>
                <input
                  type="number"
                  min={0}
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Salary max (₹ per year)</label>
                <input
                  type="number"
                  min={0}
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-sm font-600 uppercase tracking-wide text-ink-soft">
              Location
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
              />
              This role is remote
            </label>
          </section>

          <section className={sectionClass}>
            <h2 className="text-sm font-600 uppercase tracking-wide text-ink-soft">
              Skills
            </h2>

            <div className="mt-3 flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="React, TypeScript, PostgreSQL…"
                className={`${inputClass} mt-0`}
              />
              <button
                onClick={addSkill}
                className="shrink-0 rounded border border-line px-4 text-sm text-ink hover:bg-shell"
              >
                Add
              </button>
            </div>

            {skills.length > 0 && (
              <div className="mt-4 space-y-2">
                {skills.map((s, i) => (
                  <div
                    key={s.name}
                    className="flex flex-wrap items-center gap-3 rounded border border-line px-3 py-2"
                  >
                    <span className="flex-1 text-sm text-ink">{s.name}</span>

                    <label className="flex items-center gap-1 text-xs text-ink-soft">
                      <input
                        type="checkbox"
                        checked={s.isRequired}
                        onChange={(e) =>
                          updateSkill(i, { isRequired: e.target.checked })
                        }
                      />
                      Required
                    </label>

                    <label className="flex items-center gap-1 text-xs text-ink-soft">
                      Weight
                      <select
                        value={s.weight}
                        onChange={(e) =>
                          updateSkill(i, { weight: Number(e.target.value) })
                        }
                        className="rounded border border-line bg-paper px-1 py-0.5 text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      onClick={() => removeSkill(i)}
                      className="rounded p-1 text-ink-faint hover:bg-shell hover:text-ink"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <h2 className="text-sm font-600 uppercase tracking-wide text-ink-soft">
              Publishing
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Vacancies</label>
                <input
                  type="number"
                  min={1}
                  value={vacancies}
                  onChange={(e) => setVacancies(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Closes on (optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Live on the job board
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                Feature it at the top of the job list
              </label>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={() => void removeJob()}
              className="rounded border border-alert/30 px-5 py-2.5 text-sm text-alert hover:bg-alert/5"
            >
              Delete job
            </button>
          </div>
        </div>
      )}

      {/* ---------------- VIEWERS ---------------- */}
      {tab === "viewers" && (
        <div className="mt-6">
          {summary && (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-5">
              {[
                { label: "Total views", value: summary.totalViews },
                { label: "Unique visitors", value: summary.uniqueViewers },
                { label: "Signed in", value: summary.loggedInViewers },
                { label: "Anonymous", value: summary.anonymousViewers },
                { label: "Then applied", value: summary.appliedAfterViewing },
              ].map((s) => (
                <div key={s.label} className="bg-paper p-4">
                  <div className="text-xl font-600 text-ink">{s.value}</div>
                  <div className="mt-0.5 text-xs text-ink-faint">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 overflow-x-auto rounded-card border border-line">
            {viewersLoading ? (
              <div className="bg-paper p-10 text-center text-sm text-ink-soft">
                Loading…
              </div>
            ) : viewers.length === 0 ? (
              <div className="bg-paper p-10 text-center text-sm text-ink">
                Nobody has opened this job yet.
              </div>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-shell text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th className="px-4 py-3">Visitor</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Views</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {viewers.map((v) => (
                    <tr key={v.id} className="border-t border-line bg-paper">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{v.name}</div>
                        {v.email && (
                          <div className="text-xs text-ink-faint">{v.email}</div>
                        )}
                        {(v.currentTitle || v.city) && (
                          <div className="text-xs text-ink-faint">
                            {[v.currentTitle, v.city].filter(Boolean).join(" · ")}
                            {v.experienceYears != null
                              ? ` · ${v.experienceYears} yrs`
                              : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {v.isAnonymous ? (
                          <span className="text-xs text-ink-faint">—</span>
                        ) : (
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              v.isPaid
                                ? "bg-shell font-medium text-ink"
                                : "text-ink-soft"
                            }`}
                          >
                            {v.plan}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink">{v.viewCount}</td>
                      <td className="px-4 py-3">
                        {v.applied ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
                            <CheckCircle2 size={13} /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-ink-faint">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {timeAgo(v.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            Signed-in visitors are tracked by account; everyone else is counted once
            per browser.
          </p>
        </div>
      )}

      {/* ---------------- APPLICANTS ---------------- */}
      {tab === "applicants" && (
        <div className="mt-6 overflow-x-auto rounded-card border border-line">
          {applicantsLoading ? (
            <div className="bg-paper p-10 text-center text-sm text-ink-soft">
              Loading…
            </div>
          ) : applicants.length === 0 ? (
            <div className="bg-paper p-10 text-center text-sm text-ink">
              No applications yet.
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-shell text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Applied</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a.id} className="border-t border-line bg-paper">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{a.name}</div>
                      <div className="text-xs text-ink-faint">{a.email}</div>
                      {a.phone && (
                        <div className="text-xs text-ink-faint">{a.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{a.plan}</td>
                    <td className="px-4 py-3 text-ink">{a.matchScore}%</td>
                    <td className="px-4 py-3 text-ink-soft">{a.status}</td>
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      {timeAgo(a.appliedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}