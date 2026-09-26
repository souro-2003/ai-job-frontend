"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import api, { ApiError } from "@/lib/api";
import type { Resume, ResumeContent } from "@/types";

type ExperienceItem = NonNullable<ResumeContent["experience"]>[number];
type EducationItem = NonNullable<ResumeContent["education"]>[number];

interface Review {
  score: number;
  summary: string;
  issues: Array<{ section: string; problem: string; fix: string }>;
  rewrittenSummary: string;
}

const TEMPLATES = ["classic", "professional", "modern", "minimal"];

export default function ResumeEditorPage() {
  const params = useParams<{ id: string }>();

  const [resume, setResume] = useState<Resume | null>(null);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("classic");
  const [content, setContent] = useState<ResumeContent>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [review, setReview] = useState<Review | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/resumes/${params.id}`);
        const r: Resume = data.resume;
        setResume(r);
        setTitle(r.title);
        setTemplate(r.template);
        setContent(r.content ?? {});
      } catch {
        setError("Could not load this resume.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id]);

  const save = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      await api.put(`/resumes/${params.id}`, { title, template, content });
      setMessage("Saved");
      window.setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }, [params.id, title, template, content]);

  async function runReview() {
    setReviewing(true);
    setError("");

    try {
      await save();
      const { data } = await api.post("/ai/resume-review", {
        resumeId: params.id,
      });
      setReview(data.review);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The review could not be completed."
      );
    } finally {
      setReviewing(false);
    }
  }

  function patch(update: Partial<ResumeContent>) {
    setContent((prev) => ({ ...prev, ...update }));
  }

  function updateExperience(index: number, update: Partial<ExperienceItem>) {
    setContent((prev) => {
      const list = [...(prev.experience ?? [])];
      list[index] = { ...list[index], ...update };
      return { ...prev, experience: list };
    });
  }

  function updateEducation(index: number, update: Partial<EducationItem>) {
    setContent((prev) => {
      const list = [...(prev.education ?? [])];
      list[index] = { ...list[index], ...update };
      return { ...prev, education: list };
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-ink-soft">
        Loading resume…
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-alert">{error || "Resume not found."}</p>
        <Link
          href="/resumes"
          className="mt-3 inline-block text-sm text-brand hover:underline"
        >
          Back to resumes
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";
  const microLabel = "mb-1 block text-xs text-ink-faint";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/resumes"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} />
        All resumes
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-[200px] flex-1 border-0 bg-transparent p-0 font-display text-2xl text-ink focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            {TEMPLATES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <Link
            href={`/resumes/${params.id}/preview`}
            className="rounded border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-shell"
          >
            Preview
          </Link>
          <button
            onClick={runReview}
            disabled={reviewing}
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-shell disabled:opacity-60"
          >
            <Sparkles size={15} />
            {reviewing ? "Reviewing…" : "AI review"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded border border-fit/30 bg-fit-soft px-3 py-2 text-sm text-fit">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {review && (
        <div className="mt-5 rounded-card border border-line bg-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-ink">AI review</h2>
            <span className="rounded bg-fit-soft px-2.5 py-1 text-sm font-600 text-fit">
              {review.score}/100
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{review.summary}</p>

          {review.issues.length > 0 && (
            <ul className="mt-4 space-y-3 border-t border-line pt-4">
              {review.issues.map((issue, i) => (
                <li key={i} className="text-sm">
                  <p className="font-600 text-ink">{issue.section}</p>
                  <p className="text-ink-soft">{issue.problem}</p>
                  <p className="mt-0.5 text-fit">{issue.fix}</p>
                </li>
              ))}
            </ul>
          )}

          {review.rewrittenSummary && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-600 text-ink">Suggested summary</p>
              <p className="mt-1 text-sm text-ink-soft">{review.rewrittenSummary}</p>
              <button
                onClick={() => patch({ summary: review.rewrittenSummary })}
                className="mt-2 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-shell"
              >
                Use this
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contact */}
      <section className="mt-6 rounded-card border border-line bg-paper p-6">
        <h2 className="text-lg text-ink">Contact</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={microLabel}>Full name</label>
            <input
              value={content.contact?.fullName ?? ""}
              onChange={(e) =>
                patch({ contact: { ...content.contact, fullName: e.target.value } })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={microLabel}>Email</label>
            <input
              value={content.contact?.email ?? ""}
              onChange={(e) =>
                patch({ contact: { ...content.contact, email: e.target.value } })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={microLabel}>Phone</label>
            <input
              value={content.contact?.phone ?? ""}
              onChange={(e) =>
                patch({ contact: { ...content.contact, phone: e.target.value } })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={microLabel}>Location</label>
            <input
              value={content.contact?.location ?? ""}
              onChange={(e) =>
                patch({ contact: { ...content.contact, location: e.target.value } })
              }
              placeholder="City, State"
              className={inputClass}
            />
          </div>
          <div>
            <label className={microLabel}>LinkedIn</label>
            <input
              value={content.contact?.linkedin ?? ""}
              onChange={(e) =>
                patch({ contact: { ...content.contact, linkedin: e.target.value } })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={microLabel}>Portfolio or GitHub</label>
            <input
              value={content.contact?.portfolio ?? ""}
              onChange={(e) =>
                patch({ contact: { ...content.contact, portfolio: e.target.value } })
              }
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="mt-5 rounded-card border border-line bg-paper p-6">
        <h2 className="text-lg text-ink">Summary</h2>
        <textarea
          value={content.summary ?? ""}
          onChange={(e) => patch({ summary: e.target.value })}
          rows={4}
          placeholder="Three or four lines on what you do and what you are looking for."
          className={`mt-4 ${inputClass}`}
        />
      </section>

      {/* Skills */}
      <section className="mt-5 rounded-card border border-line bg-paper p-6">
        <h2 className="text-lg text-ink">Skills</h2>
        <p className="mt-1 text-sm text-ink-soft">Separate with commas.</p>
        <input
          value={(content.skills ?? []).join(", ")}
          onChange={(e) =>
            patch({
              skills: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="React, TypeScript, PostgreSQL"
          className={`mt-3 ${inputClass}`}
        />
      </section>

      {/* Experience */}
      <section className="mt-5 rounded-card border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-ink">Experience</h2>
          <button
            onClick={() =>
              patch({
                experience: [
                  ...(content.experience ?? []),
                  { company: "", title: "", bullets: [] },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-shell"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {(content.experience ?? []).map((item, index) => (
            <div key={index} className="rounded border border-line p-4">
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    patch({
                      experience: (content.experience ?? []).filter(
                        (_, i) => i !== index
                      ),
                    })
                  }
                  className="p-1 text-ink-faint hover:text-alert"
                  aria-label="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={microLabel}>Job title</label>
                  <input
                    value={item.title}
                    onChange={(e) =>
                      updateExperience(index, { title: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={microLabel}>Company</label>
                  <input
                    value={item.company}
                    onChange={(e) =>
                      updateExperience(index, { company: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={microLabel}>Start</label>
                  <input
                    value={item.startDate ?? ""}
                    onChange={(e) =>
                      updateExperience(index, { startDate: e.target.value })
                    }
                    placeholder="2023-01"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={microLabel}>End</label>
                  <input
                    value={item.endDate ?? ""}
                    onChange={(e) =>
                      updateExperience(index, { endDate: e.target.value })
                    }
                    placeholder="Leave blank if current"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={microLabel}>
                  Achievements — one per line
                </label>
                <textarea
                  value={(item.bullets ?? []).join("\n")}
                  onChange={(e) =>
                    updateExperience(index, {
                      bullets: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  rows={4}
                  placeholder="Start with a verb and include a number where you can."
                  className={inputClass}
                />
              </div>
            </div>
          ))}

          {(content.experience ?? []).length === 0 && (
            <p className="text-sm text-ink-soft">
              No experience added. Add your most recent job first.
            </p>
          )}
        </div>
      </section>

      {/* Education */}
      <section className="mt-5 mb-10 rounded-card border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-ink">Education</h2>
          <button
            onClick={() =>
              patch({
                education: [
                  ...(content.education ?? []),
                  { institution: "", degree: "" },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-shell"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {(content.education ?? []).map((item, index) => (
            <div key={index} className="rounded border border-line p-4">
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    patch({
                      education: (content.education ?? []).filter(
                        (_, i) => i !== index
                      ),
                    })
                  }
                  className="p-1 text-ink-faint hover:text-alert"
                  aria-label="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={microLabel}>Degree</label>
                  <input
                    value={item.degree}
                    onChange={(e) =>
                      updateEducation(index, { degree: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={microLabel}>Field</label>
                  <input
                    value={item.field ?? ""}
                    onChange={(e) =>
                      updateEducation(index, { field: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={microLabel}>Institution</label>
                  <input
                    value={item.institution}
                    onChange={(e) =>
                      updateEducation(index, { institution: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={microLabel}>Start year</label>
                  <input
                    value={String(item.startYear ?? "")}
                    onChange={(e) =>
                      updateEducation(index, { startYear: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={microLabel}>End year</label>
                  <input
                    value={String(item.endYear ?? "")}
                    onChange={(e) =>
                      updateEducation(index, { endYear: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}

          {(content.education ?? []).length === 0 && (
            <p className="text-sm text-ink-soft">No education added yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}