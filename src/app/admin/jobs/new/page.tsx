"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import api from "@/lib/api";

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

const labelClass = "block text-sm font-medium text-ink";
const inputClass =
  "mt-1 w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink";
const sectionClass = "rounded-card border border-line bg-paper p-5";

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export default function NewAdminJobPage() {
  const router = useRouter();

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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/job-companies")
      .then(({ data }) => setCompanies(data.companies ?? []))
      .catch(() => setCompanies([]));
  }, []);

  const descriptionShort = description.trim().length < 30;

  const canSubmit = useMemo(() => {
    if (title.trim().length < 3) return false;
    if (descriptionShort) return false;
    if (companyMode === "existing") return Boolean(companyId);
    return companyName.trim().length >= 2;
  }, [title, descriptionShort, companyMode, companyId, companyName]);

  const addSkill = () => {
    const name = skillInput.trim();
    if (!name) return;

    const exists = skills.some(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setSkillInput("");
      return;
    }

    setSkills((prev) => [...prev, { name, isRequired: true, weight: 3 }]);
    setSkillInput("");
  };

  const updateSkill = (index: number, patch: Partial<SkillRow>) => {
    setSkills((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const removeSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    setSaving(true);
    setError("");

    const payload = {
      companyId: companyMode === "existing" ? companyId : null,
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
      await api.post("/admin/jobs", payload);
      router.push("/admin/jobs");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not create the job.";
      setError(message);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} />
        Back to jobs
      </Link>

      <h1 className="mt-3 text-2xl text-ink">Add a job</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Candidates see this listing once it is live. They can only apply after
        buying a plan.
      </p>

      {error && (
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-5">
        {/* ---------------- company ---------------- */}
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
              {companies.length === 0 && (
                <p className="mt-1 text-xs text-ink-faint">
                  No approved companies yet. Type the name instead.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Company name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Technologies"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Website (optional)</label>
                <input
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://acme.com"
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
                placeholder="https://careers.acme.com/job/123"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact email (optional)</label>
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hr@acme.com"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ---------------- role ---------------- */}
        <section className={sectionClass}>
          <h2 className="text-sm font-600 uppercase tracking-wide text-ink-soft">
            The role
          </h2>

          <div className="mt-4">
            <label className={labelClass}>Job title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior React Developer"
              className={inputClass}
            />
          </div>

          <div className="mt-4">
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="What the role involves, the team, the product…"
              className={inputClass}
            />
            <p
              className={`mt-1 text-xs ${
                descriptionShort && description.length > 0
                  ? "text-alert"
                  : "text-ink-faint"
              }`}
            >
              {description.trim().length} characters — minimum 30.
            </p>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Responsibilities (optional)</label>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              rows={4}
              placeholder="One per line"
              className={inputClass}
            />
          </div>

          <div className="mt-4">
            <label className={labelClass}>Requirements (optional)</label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={4}
              placeholder="One per line"
              className={inputClass}
            />
          </div>
        </section>

        {/* ---------------- details ---------------- */}
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
                placeholder="600000"
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
                placeholder="900000"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ---------------- location ---------------- */}
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
                placeholder="Kolkata"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="West Bengal"
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

        {/* ---------------- skills ---------------- */}
        <section className={sectionClass}>
          <h2 className="text-sm font-600 uppercase tracking-wide text-ink-soft">
            Skills
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            These drive the match score candidates see. New skills are created
            automatically.
          </p>

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

        {/* ---------------- publishing ---------------- */}
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
              Publish immediately
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
            onClick={() => void submit()}
            disabled={!canSubmit || saving}
            className="rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Create job"}
          </button>
          <Link
            href="/admin/jobs"
            className="rounded border border-line px-5 py-2.5 text-sm text-ink hover:bg-shell"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}