"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import api, { ApiError } from "@/lib/api";
import type { Job, Skill } from "@/types";

const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
];

const LEVELS = [
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
];

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [grouped, setGrouped] = useState<Record<string, Skill[]>>({});
  const [required, setRequired] = useState<Set<string>>(new Set());
  const [optional, setOptional] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    responsibilities: "",
    requirements: "",
    jobType: "FULL_TIME",
    experienceLevel: "JUNIOR",
    minExperience: "0",
    maxExperience: "",
    salaryMin: "",
    salaryMax: "",
    city: "",
    state: "",
    isRemote: false,
    vacancies: "1",
    expiresAt: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [skillsRes, jobsRes] = await Promise.all([
          api.get("/profile/skills/all"),
          api.get("/jobs/mine"),
        ]);

        setGrouped(skillsRes.data.grouped);

        const job: Job | undefined = jobsRes.data.jobs.find(
          (item: Job) => item.id === params.id
        );

        if (!job) {
          setError("That job is not yours, or it no longer exists.");
          return;
        }

        setForm({
          title: job.title,
          description: job.description ?? "",
          responsibilities: job.responsibilities ?? "",
          requirements: job.requirements ?? "",
          jobType: job.jobType,
          experienceLevel: job.experienceLevel,
          minExperience: String(job.minExperience),
          maxExperience: job.maxExperience ? String(job.maxExperience) : "",
          salaryMin: job.salaryMin ? String(job.salaryMin) : "",
          salaryMax: job.salaryMax ? String(job.salaryMax) : "",
          city: job.city ?? "",
          state: job.state ?? "",
          isRemote: job.isRemote,
          vacancies: String(job.vacancies),
          expiresAt: job.expiresAt ? job.expiresAt.slice(0, 10) : "",
        });

        setRequired(
          new Set(job.skills.filter((s) => s.isRequired).map((s) => s.skillId))
        );
        setOptional(
          new Set(job.skills.filter((s) => !s.isRequired).map((s) => s.skillId))
        );
      } catch {
        setError("Could not load this job.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [params.id]);

  function toggleSkill(id: string) {
    if (required.has(id)) {
      setRequired((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setOptional((prev) => new Set(prev).add(id));
      return;
    }

    if (optional.has(id)) {
      setOptional((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    setRequired((prev) => new Set(prev).add(id));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.title.trim() || form.description.trim().length < 20) {
      setError("A job title and a description of at least 20 characters are needed.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const skills = [
      ...Array.from(required).map((skillId) => ({
        skillId,
        isRequired: true,
        weight: 2,
      })),
      ...Array.from(optional).map((skillId) => ({
        skillId,
        isRequired: false,
        weight: 1,
      })),
    ];

    try {
      await api.put(`/jobs/${params.id}`, {
        title: form.title,
        description: form.description,
        responsibilities: form.responsibilities || undefined,
        requirements: form.requirements || undefined,
        jobType: form.jobType,
        experienceLevel: form.experienceLevel,
        minExperience: Number(form.minExperience) || 0,
        maxExperience: form.maxExperience ? Number(form.maxExperience) : undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        isRemote: form.isRemote,
        vacancies: Number(form.vacancies) || 1,
        expiresAt: form.expiresAt || undefined,
        skills,
      });

      setMessage("Changes saved.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => router.push(`/employer/jobs/${params.id}`), 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  const inputClass =
    "w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";
  const labelClass = "mb-1 block text-xs text-ink-faint";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/employer/jobs/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} />
        Back to applicants
      </Link>

      <h1 className="mt-4 text-2xl text-ink">Edit job</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Changing the skills re-scores future applicants. Scores already recorded on
        existing applications stay as they were.
      </p>

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

      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <section className="rounded-card border border-line bg-paper p-6">
          <h2 className="text-lg text-ink">The role</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className={labelClass}>Job title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={6}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Responsibilities</label>
              <textarea
                value={form.responsibilities}
                onChange={(e) =>
                  setForm({ ...form, responsibilities: e.target.value })
                }
                rows={4}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Requirements</label>
              <textarea
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                rows={4}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line bg-paper p-6">
          <h2 className="text-lg text-ink">Details</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Job type</label>
              <select
                value={form.jobType}
                onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                className={inputClass}
              >
                {JOB_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Experience level</label>
              <select
                value={form.experienceLevel}
                onChange={(e) =>
                  setForm({ ...form, experienceLevel: e.target.value })
                }
                className={inputClass}
              >
                {LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Minimum years</label>
              <input
                type="number"
                min={0}
                value={form.minExperience}
                onChange={(e) =>
                  setForm({ ...form, minExperience: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Maximum years</label>
              <input
                type="number"
                min={0}
                value={form.maxExperience}
                onChange={(e) =>
                  setForm({ ...form, maxExperience: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Salary from</label>
              <input
                type="number"
                min={0}
                value={form.salaryMin}
                onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Salary to</label>
              <input
                type="number"
                min={0}
                value={form.salaryMax}
                onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>City</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                disabled={form.isRemote}
                className={`${inputClass} disabled:bg-shell`}
              />
            </div>

            <div>
              <label className={labelClass}>State</label>
              <input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                disabled={form.isRemote}
                className={`${inputClass} disabled:bg-shell`}
              />
            </div>

            <div>
              <label className={labelClass}>Openings</label>
              <input
                type="number"
                min={1}
                value={form.vacancies}
                onChange={(e) => setForm({ ...form, vacancies: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Closes on</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isRemote}
                onChange={(e) => setForm({ ...form, isRemote: e.target.checked })}
              />
              This role is fully remote
            </label>
          </div>
        </section>

        <section className="rounded-card border border-line bg-paper p-6">
          <h2 className="text-lg text-ink">Skills</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Click once for required, twice for nice to have, three times to clear.
          </p>

          <div className="mt-3 flex gap-4 text-sm">
            <span className="text-fit">{required.size} required</span>
            <span className="text-ink-soft">{optional.size} nice to have</span>
          </div>

          <div className="mt-4 space-y-4">
            {Object.entries(grouped).map(([category, skills]) => (
              <div key={category}>
                <h3 className="text-sm font-600 text-ink-soft">{category}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((skill) => {
                    const isRequired = required.has(skill.id);
                    const isOptional = optional.has(skill.id);

                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-sm ${
                          isRequired
                            ? "border-fit bg-fit-soft text-fit"
                            : isOptional
                              ? "border-line bg-shell text-ink"
                              : "border-line bg-paper text-ink-soft hover:border-ink-faint"
                        }`}
                      >
                        {isRequired && <Check size={12} />}
                        {skill.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3 pb-10">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand px-5 py-2.5 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/employer/jobs/${params.id}`}
            className="rounded border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-shell"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}