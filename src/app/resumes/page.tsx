"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Star,
  Trash2,
  Lock,
  Pencil,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import api, { ApiError, timeAgo } from "@/lib/api";
import ResumeTemplate from "@/components/ResumeTemplates";
import type { Resume, ResumeContent } from "@/types";

const TEMPLATES = [
  { value: "classic", label: "Classic" },
  { value: "professional", label: "Professional" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
];

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #resume-print-area, #resume-print-area * { visibility: visible !important; }
  #resume-print-area {
    position: absolute !important;
    inset: 0 auto auto 0;
    width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
  }
  @page { margin: 12mm; }
}
`;

interface Check {
  label: string;
  ok: boolean;
  hint: string;
}

/** A quick audit of what employers look for first. */
function auditResume(content: ResumeContent | undefined): Check[] {
  const c = content ?? {};
  const bulletCount = (c.experience ?? []).reduce(
    (sum, e) => sum + (e.bullets?.length ?? 0),
    0
  );

  return [
    {
      label: "Contact details",
      ok: Boolean(c.contact?.email && c.contact?.phone),
      hint: "Add an email and phone number so employers can reach you.",
    },
    {
      label: "Profile summary",
      ok: (c.summary ?? "").trim().length >= 60,
      hint: "Write two or three lines on what you do and what you want next.",
    },
    {
      label: "Five or more skills",
      ok: (c.skills ?? []).length >= 5,
      hint: "Matching reads your skills. Thin lists score lower on every job.",
    },
    {
      label: "Work history",
      ok: (c.experience ?? []).length > 0,
      hint: "Add at least one role, even an internship or freelance work.",
    },
    {
      label: "Achievements under each role",
      ok: bulletCount >= 2,
      hint: "Bullets with numbers beat job descriptions. Add what you shipped.",
    },
    {
      label: "Education",
      ok: (c.education ?? []).length > 0,
      hint: "Add your degree, institution and year.",
    },
  ];
}

export default function ResumesPage() {
  const router = useRouter();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedTemplate, setSavedTemplate] = useState(false);

  async function load(keepSelection = true) {
    setLoading(true);

    try {
      const { data } = await api.get("/resumes");
      const rows: Resume[] = data.resumes ?? [];
      setResumes(rows);

      setSelectedId((current) => {
        if (keepSelection && current && rows.some((r) => r.id === current)) {
          return current;
        }
        return rows.find((r) => r.isPrimary)?.id ?? rows[0]?.id ?? null;
      });
    } catch {
      setError("Could not load your resumes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(false);
  }, []);

  const selected = useMemo(
    () => resumes.find((r) => r.id === selectedId) ?? null,
    [resumes, selectedId]
  );

  // The preview can try another template without saving it.
  const shownTemplate = previewTemplate ?? selected?.template ?? "classic";

  useEffect(() => {
    setPreviewTemplate(null);
    setSavedTemplate(false);
  }, [selectedId]);

  const checks = useMemo(() => auditResume(selected?.content), [selected]);
  const passed = checks.filter((c) => c.ok).length;
  const health = Math.round((passed / checks.length) * 100);

  async function createResume() {
    setCreating(true);
    setLocked(null);
    setError("");

    try {
      const { data: prefill } = await api.get("/resumes/prefill");
      const { data } = await api.post("/resumes", {
        title: "My Resume",
        template: "classic",
        content: prefill.content,
      });
      router.push(`/resumes/${data.resume.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.isPaywall) {
        setLocked(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Could not create the resume.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function makePrimary(id: string) {
    setBusyId(id);
    try {
      await api.patch(`/resumes/${id}/primary`);
      await load();
    } catch {
      setError("Could not change the primary resume.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? Applications already sent keep their copy.`)) {
      return;
    }

    setBusyId(id);
    try {
      await api.delete(`/resumes/${id}`);
      await load(false);
    } catch {
      setError("Could not delete that resume.");
    } finally {
      setBusyId(null);
    }
  }

  /** Saves the template the preview is currently showing. */
  async function applyTemplate() {
    if (!selected || !previewTemplate) return;

    setBusyId(selected.id);
    try {
      await api.patch(`/resumes/${selected.id}`, { template: previewTemplate });
      setSavedTemplate(true);
      setPreviewTemplate(null);
      await load();
      window.setTimeout(() => setSavedTemplate(false), 2500);
    } catch {
      setError("Could not change the template.");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(resume: Resume) {
    setBusyId(resume.id);
    try {
      const { data } = await api.post("/resumes", {
        title: `${resume.title} (copy)`,
        template: resume.template,
        content: resume.content,
      });
      router.push(`/resumes/${data.resume.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.isPaywall) {
        setLocked(err.message);
      } else {
        setError("Could not duplicate that resume.");
      }
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      <style>{PRINT_CSS}</style>

      {/* ---------------- bar ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {resumes.length === 0
            ? "No resumes yet."
            : `${resumes.length} resume${resumes.length === 1 ? "" : "s"} · applications send the primary one unless you pick another.`}
        </p>

        <button
          onClick={createResume}
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded bg-brand px-4 py-1.5 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
        >
          <Plus size={15} />
          {creating ? "Creating…" : "New resume"}
        </button>
      </div>

      {locked && (
        <div className="mt-4 rounded-card border border-locked/30 bg-locked-soft p-5">
          <div className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 shrink-0 text-locked" />
            <div>
              <h2 className="text-base font-600 text-ink">{locked}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Your profile data is already saved. Pick a plan and the builder
                fills itself in from it.
              </p>
              <Link
                href="/pricing"
                className="mt-3 inline-block rounded bg-locked px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
              >
                See plans
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-4 rounded-card border border-line bg-paper p-12 text-center text-sm text-ink-soft">
          Loading…
        </div>
      ) : resumes.length === 0 ? (
        <div className="mt-4 rounded-card border border-line bg-paper p-14 text-center">
          <FileText size={26} className="mx-auto text-ink-faint" />
          <p className="mt-3 text-sm text-ink">You have no resumes yet.</p>
          <p className="mt-1 text-sm text-ink-soft">
            Fill in your profile first — the builder starts from what you already
            entered, so you are editing rather than typing from scratch.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href="/profile"
              className="rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell"
            >
              Open profile
            </Link>
            <button
              onClick={createResume}
              disabled={creating}
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
            >
              Build my resume
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr_280px]">
          {/* ---------------- list ---------------- */}
          <div className="space-y-2">
            {resumes.map((resume) => {
              const active = resume.id === selectedId;

              return (
                <div
                  key={resume.id}
                  onClick={() => setSelectedId(resume.id)}
                  className={`cursor-pointer rounded-card border bg-paper p-4 ${
                    active
                      ? "border-brand ring-1 ring-brand/30"
                      : "border-line hover:bg-shell/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-600 text-ink">
                      {resume.title}
                    </h3>
                    {resume.isPrimary && (
                      <span className="shrink-0 rounded bg-fit-soft px-2 py-0.5 text-xs font-medium text-fit">
                        Primary
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-ink-faint">
                    {resume.template} · updated {timeAgo(resume.updatedAt)}
                  </p>

                  {resume._count && resume._count.applications > 0 && (
                    <p className="mt-1 text-xs text-ink-soft">
                      Sent with {resume._count.applications} application
                      {resume._count.applications === 1 ? "" : "s"}
                    </p>
                  )}

                  <div
                    className="mt-3 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/resumes/${resume.id}`}
                      title="Edit"
                      className="rounded border border-line p-1.5 text-ink-faint hover:bg-shell hover:text-ink"
                    >
                      <Pencil size={13} />
                    </Link>

                    <button
                      onClick={() => void duplicate(resume)}
                      disabled={busyId === resume.id}
                      title="Duplicate"
                      className="rounded border border-line p-1.5 text-ink-faint hover:bg-shell hover:text-ink disabled:opacity-40"
                    >
                      <Copy size={13} />
                    </button>

                    {!resume.isPrimary && (
                      <button
                        onClick={() => void makePrimary(resume.id)}
                        disabled={busyId === resume.id}
                        title="Make primary"
                        className="rounded border border-line p-1.5 text-ink-faint hover:bg-shell hover:text-fit disabled:opacity-40"
                      >
                        <Star size={13} />
                      </button>
                    )}

                    <button
                      onClick={() => void remove(resume.id, resume.title)}
                      disabled={busyId === resume.id}
                      title="Delete"
                      className="ml-auto rounded border border-line p-1.5 text-ink-faint hover:bg-alert/5 hover:text-alert disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---------------- preview ---------------- */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-card border border-b-0 border-line bg-paper px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {TEMPLATES.map((t) => {
                  const active = shownTemplate === t.value;

                  return (
                    <button
                      key={t.value}
                      onClick={() =>
                        setPreviewTemplate(
                          t.value === selected?.template ? null : t.value
                        )
                      }
                      className={`rounded px-2.5 py-1 text-xs ${
                        active
                          ? "bg-ink text-paper"
                          : "text-ink-soft hover:bg-shell hover:text-ink"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {savedTemplate && (
                  <span className="inline-flex items-center gap-1 text-xs text-fit">
                    <Check size={13} />
                    Saved
                  </span>
                )}

                {previewTemplate && previewTemplate !== selected?.template && (
                  <button
                    onClick={() => void applyTemplate()}
                    disabled={busyId === selected?.id}
                    className="rounded bg-brand px-3 py-1 text-xs font-medium text-paper hover:bg-brand-deep disabled:opacity-50"
                  >
                    Use this template
                  </button>
                )}

                <button
                  onClick={() => window.print()}
                  title="Print or save as PDF"
                  className="rounded border border-line p-1.5 text-ink-soft hover:bg-shell hover:text-ink"
                >
                  <Printer size={14} />
                </button>

                {selected && (
                  <Link
                    href={`/resumes/${selected.id}`}
                    className="rounded border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-shell"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>

                        <div
              id="resume-print-area"
              className="overflow-x-auto rounded-b-card border border-line bg-white"
            >
              {selected?.content ? (
                <ResumeTemplate
                  template={shownTemplate}
                  content={selected.content}
                />
              ) : (
                <div className="p-14 text-center text-sm text-ink-soft">
                  This resume has no content yet.{" "}
                  {selected && (
                    <Link
                      href={`/resumes/${selected.id}`}
                      className="text-brand hover:underline"
                    >
                      Open the builder
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---------------- health ---------------- */}
          <aside className="space-y-4">
            <div className="rounded-card border border-line bg-paper p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-600 text-ink">Resume health</h2>
                <span
                  className={`font-display text-2xl font-700 ${
                    health >= 80 ? "text-fit" : health >= 50 ? "text-locked" : "text-alert"
                  }`}
                >
                  {health}
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded bg-shell">
                <div
                  className={`h-full ${
                    health >= 80 ? "bg-fit" : health >= 50 ? "bg-locked" : "bg-alert"
                  }`}
                  style={{ width: `${health}%` }}
                />
              </div>

              <ul className="mt-4 space-y-2.5">
                {checks.map((check) => (
                  <li key={check.label}>
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${
                          check.ok ? "bg-fit" : "bg-locked"
                        }`}
                      />
                      <span
                        className={`text-sm ${check.ok ? "text-ink-soft" : "text-ink"}`}
                      >
                        {check.label}
                      </span>
                    </div>
                    {!check.ok && (
                      <p className="ml-3.5 mt-0.5 text-xs text-ink-faint">
                        {check.hint}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              {selected && passed < checks.length && (
                <Link
                  href={`/resumes/${selected.id}`}
                  className="mt-4 block rounded border border-line px-3 py-2 text-center text-sm font-medium text-ink hover:bg-shell"
                >
                  Fix these
                </Link>
              )}
            </div>

            {selected?._count && selected._count.applications > 0 && (
              <div className="rounded-card border border-line bg-paper p-5">
                <h2 className="text-sm font-600 text-ink">Where this one went</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  Sent with {selected._count.applications} application
                  {selected._count.applications === 1 ? "" : "s"}.
                </p>
                <Link
                  href="/applications"
                  className="mt-3 block text-sm text-brand hover:underline"
                >
                  See how they are doing
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}