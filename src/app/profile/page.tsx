"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import api, { ApiError } from "@/lib/api";
import type { CandidateProfile, Skill } from "@/types";

const LEVELS = ["FRESHER", "JUNIOR", "MID", "SENIOR", "LEAD"] as const;

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [grouped, setGrouped] = useState<Record<string, Skill[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    headline: "",
    summary: "",
    city: "",
    state: "",
    currentTitle: "",
    experienceYears: 0,
    experienceLevel: "FRESHER" as (typeof LEVELS)[number],
    expectedSalary: "",
    noticePeriodDays: "",
    openToRemote: true,
  });

  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const [edu, setEdu] = useState({
    institution: "",
    degree: "",
    field: "",
    startYear: "",
    endYear: "",
    grade: "",
  });

  const [exp, setExp] = useState({
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [profileRes, skillsRes] = await Promise.all([
        api.get("/profile"),
        api.get("/profile/skills/all"),
      ]);

      const p: CandidateProfile = profileRes.data.profile;
      setProfile(p);
      setGrouped(skillsRes.data.grouped);
      setSelectedSkills(new Set(p.skills.map((s) => s.skillId)));

      setForm({
        headline: p.headline ?? "",
        summary: p.summary ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        currentTitle: p.currentTitle ?? "",
        experienceYears: p.experienceYears,
        experienceLevel: p.experienceLevel,
        expectedSalary: p.expectedSalary?.toString() ?? "",
        noticePeriodDays: p.noticePeriodDays?.toString() ?? "",
        openToRemote: p.openToRemote,
      });
    } catch {
      setError("Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function flash(text: string) {
    setMessage(text);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => setMessage(""), 2500);
  }

  function fail(text: string) {
    setError(text);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveBasics(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const { data } = await api.put("/profile", {
        headline: form.headline || undefined,
        summary: form.summary || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        currentTitle: form.currentTitle || undefined,
        experienceYears: Number(form.experienceYears) || 0,
        experienceLevel: form.experienceLevel,
        expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : undefined,
        noticePeriodDays: form.noticePeriodDays
          ? Number(form.noticePeriodDays)
          : undefined,
        openToRemote: form.openToRemote,
      });
      setProfile((prev) =>
        prev ? { ...prev, profileScore: data.profile.profileScore } : prev
      );
      flash("Profile saved");
    } catch (err) {
      fail(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSkill(id: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveSkills() {
    setSaving(true);
    try {
      const { data } = await api.put("/profile/skills", {
        skills: Array.from(selectedSkills).map((skillId) => ({
          skillId,
          proficiency: 3,
          years: 0,
        })),
      });
      setProfile(data.profile);
      flash(`${selectedSkills.size} skills saved`);
    } catch (err) {
      fail(err instanceof ApiError ? err.message : "Could not save skills.");
    } finally {
      setSaving(false);
    }
  }

  async function addEducation(event: React.FormEvent) {
    event.preventDefault();

    if (!edu.degree || !edu.institution || !edu.startYear) {
      fail("Degree, institution and start year are all needed.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/profile/education", {
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field || undefined,
        startYear: Number(edu.startYear),
        endYear: edu.endYear ? Number(edu.endYear) : undefined,
        grade: edu.grade || undefined,
      });
      setEdu({
        institution: "",
        degree: "",
        field: "",
        startYear: "",
        endYear: "",
        grade: "",
      });
      await loadAll();
      flash("Education added");
    } catch (err) {
      fail(err instanceof ApiError ? err.message : "Could not add education.");
    } finally {
      setSaving(false);
    }
  }

  async function addExperience(event: React.FormEvent) {
    event.preventDefault();

    if (!exp.title || !exp.company || !exp.startDate) {
      fail("Job title, company and start month are all needed.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/profile/experience", {
        company: exp.company,
        title: exp.title,
        location: exp.location || undefined,
        startDate: exp.startDate,
        endDate: exp.isCurrent || !exp.endDate ? undefined : exp.endDate,
        isCurrent: exp.isCurrent,
        description: exp.description || undefined,
      });
      setExp({
        company: "",
        title: "",
        location: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
      });
      await loadAll();
      flash("Experience added");
    } catch (err) {
      fail(err instanceof ApiError ? err.message : "Could not add experience.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEducation(id: string) {
    await api.delete(`/profile/education/${id}`);
    await loadAll();
  }

  async function removeExperience(id: string) {
    await api.delete(`/profile/experience/${id}`);
    await loadAll();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-ink-soft">
        Loading your profile…
      </div>
    );
  }

  const inputClass =
    "w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";
  const labelClass = "block text-sm font-medium text-ink";
  const microLabel = "mb-1 block text-xs text-ink-faint";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">Your profile</h1>
          <p className="mt-1 text-sm text-ink-soft">
            This is what jobs are matched against. The more you fill in, the more
            accurate your fit scores.
          </p>
        </div>
        {profile && (
          <div className="shrink-0 text-right">
            <div className="text-2xl font-600 text-brand">
              {profile.profileScore}%
            </div>
            <div className="text-xs text-ink-faint">complete</div>
          </div>
        )}
      </div>

      {message && (
        <p className="mt-4 rounded border border-fit/30 bg-fit-soft px-3 py-2 text-sm text-fit">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {/* Basics */}
      <section className="mt-6 rounded-card border border-line bg-paper p-6">
        <h2 className="text-lg text-ink">Basics</h2>

        <form onSubmit={saveBasics} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Headline</label>
            <input
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              placeholder="Frontend developer looking for remote work"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>Current job title</label>
            <input
              value={form.currentTitle}
              onChange={(e) => setForm({ ...form, currentTitle: e.target.value })}
              placeholder="React Developer"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>Years of experience</label>
            <input
              type="number"
              min={0}
              max={60}
              value={form.experienceYears}
              onChange={(e) =>
                setForm({ ...form, experienceYears: Number(e.target.value) })
              }
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Durgapur"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>State</label>
            <input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="West Bengal"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>Experience level</label>
            <select
              value={form.experienceLevel}
              onChange={(e) =>
                setForm({
                  ...form,
                  experienceLevel: e.target.value as (typeof LEVELS)[number],
                })
              }
              className={`mt-1.5 ${inputClass}`}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0) + l.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Expected salary (per year)</label>
            <input
              type="number"
              min={0}
              value={form.expectedSalary}
              onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })}
              placeholder="600000"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>Notice period (days)</label>
            <input
              type="number"
              min={0}
              value={form.noticePeriodDays}
              onChange={(e) =>
                setForm({ ...form, noticePeriodDays: e.target.value })
              }
              placeholder="30"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div className="flex items-center sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.openToRemote}
                onChange={(e) =>
                  setForm({ ...form, openToRemote: e.target.checked })
                }
              />
              Open to remote work
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>About you</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={4}
              placeholder="A few lines on what you do and what you are looking for."
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save basics"}
            </button>
          </div>
        </form>
      </section>

      {/* Skills */}
      <section className="mt-5 rounded-card border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-ink">Skills</h2>
          <span className="text-sm text-ink-soft">{selectedSkills.size} selected</span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Pick everything you can actually do. This drives most of your match score.
        </p>

        <div className="mt-4 space-y-4">
          {Object.entries(grouped).map(([category, skills]) => (
            <div key={category}>
              <h3 className="text-sm font-600 text-ink-soft">{category}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const on = selectedSkills.has(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-sm ${
                        on
                          ? "border-fit bg-fit-soft text-fit"
                          : "border-line bg-paper text-ink-soft hover:border-ink-faint"
                      }`}
                    >
                      {on && <Check size={12} />}
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={saveSkills}
          disabled={saving}
          className="mt-5 rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save skills"}
        </button>
      </section>

      {/* Experience */}
      <section className="mt-5 rounded-card border border-line bg-paper p-6">
        <h2 className="text-lg text-ink">Work experience</h2>

        {profile && profile.experiences.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {profile.experiences.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-600 text-ink">{item.title}</p>
                  <p className="text-sm text-ink-soft">
                    {item.company}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {item.startDate.slice(0, 7)} –{" "}
                    {item.isCurrent ? "present" : (item.endDate?.slice(0, 7) ?? "")}
                  </p>
                </div>
                <button
                  onClick={() => removeExperience(item.id)}
                  className="p-1 text-ink-faint hover:text-alert"
                  aria-label="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={addExperience}
          className="mt-4 grid gap-3 sm:grid-cols-2"
          noValidate
        >
          <div>
            <label className={microLabel}>Job title</label>
            <input
              value={exp.title}
              onChange={(e) => setExp({ ...exp, title: e.target.value })}
              placeholder="React Developer"
              className={inputClass}
            />
          </div>

          <div>
            <label className={microLabel}>Company</label>
            <input
              value={exp.company}
              onChange={(e) => setExp({ ...exp, company: e.target.value })}
              placeholder="Company name"
              className={inputClass}
            />
          </div>

          <div>
            <label className={microLabel}>Location</label>
            <input
              value={exp.location}
              onChange={(e) => setExp({ ...exp, location: e.target.value })}
              placeholder="Kolkata"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={microLabel}>Start month</label>
              <input
                type="month"
                value={exp.startDate}
                onChange={(e) => setExp({ ...exp, startDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={microLabel}>End month</label>
              <input
                type="month"
                value={exp.endDate}
                onChange={(e) => setExp({ ...exp, endDate: e.target.value })}
                disabled={exp.isCurrent}
                className={`${inputClass} disabled:bg-shell`}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={exp.isCurrent}
              onChange={(e) => setExp({ ...exp, isCurrent: e.target.checked })}
            />
            I work here now
          </label>

          <div className="sm:col-span-2">
            <label className={microLabel}>What you did there</label>
            <textarea
              value={exp.description}
              onChange={(e) => setExp({ ...exp, description: e.target.value })}
              rows={3}
              placeholder="One point per line."
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell disabled:opacity-60"
            >
              <Plus size={15} />
              Add experience
            </button>
          </div>
        </form>
      </section>

      {/* Education */}
      <section className="mt-5 mb-10 rounded-card border border-line bg-paper p-6">
        <h2 className="text-lg text-ink">Education</h2>

        {profile && profile.educations.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {profile.educations.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-600 text-ink">
                    {item.degree}
                    {item.field ? ` in ${item.field}` : ""}
                  </p>
                  <p className="text-sm text-ink-soft">{item.institution}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {item.startYear} – {item.endYear ?? "present"}
                    {item.grade ? ` · ${item.grade}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeEducation(item.id)}
                  className="p-1 text-ink-faint hover:text-alert"
                  aria-label="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={addEducation}
          className="mt-4 grid gap-3 sm:grid-cols-2"
          noValidate
        >
          <div>
            <label className={microLabel}>Degree</label>
            <input
              value={edu.degree}
              onChange={(e) => setEdu({ ...edu, degree: e.target.value })}
              placeholder="B.Tech, MBA…"
              className={inputClass}
            />
          </div>

          <div>
            <label className={microLabel}>Field of study</label>
            <input
              value={edu.field}
              onChange={(e) => setEdu({ ...edu, field: e.target.value })}
              placeholder="Computer Science"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={microLabel}>Institution</label>
            <input
              value={edu.institution}
              onChange={(e) => setEdu({ ...edu, institution: e.target.value })}
              placeholder="College or university name"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={microLabel}>Start year</label>
              <input
                type="number"
                value={edu.startYear}
                onChange={(e) => setEdu({ ...edu, startYear: e.target.value })}
                placeholder="2019"
                min={1950}
                max={2100}
                className={inputClass}
              />
            </div>
            <div>
              <label className={microLabel}>End year</label>
              <input
                type="number"
                value={edu.endYear}
                onChange={(e) => setEdu({ ...edu, endYear: e.target.value })}
                placeholder="2023"
                min={1950}
                max={2100}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={microLabel}>Grade or percentage</label>
            <input
              value={edu.grade}
              onChange={(e) => setEdu({ ...edu, grade: e.target.value })}
              placeholder="8.2 CGPA"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell disabled:opacity-60"
            >
              <Plus size={15} />
              Add education
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}