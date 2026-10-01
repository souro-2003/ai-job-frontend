"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Sparkles,
  ArrowLeft,
  Printer,
  Check,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import api, { ApiError } from "@/lib/api";
import ResumeTemplate from "@/components/ResumeTemplates";
import type { Resume, ResumeContent } from "@/types";

type ExperienceItem = NonNullable<ResumeContent["experience"]>[number];
type EducationItem = NonNullable<ResumeContent["education"]>[number];

interface Review {
  score: number;
  summary: string;
  issues: Array<{ section: string; problem: string; fix: string }>;
  rewrittenSummary: string;
}

const TEMPLATES = [
  { value: "classic", label: "Classic", atsSafe: true },
  { value: "professional", label: "Professional", atsSafe: false },
  { value: "modern", label: "Modern", atsSafe: false },
  { value: "minimal", label: "Minimal", atsSafe: true },
];

/** A4 width in CSS pixels, which is what .resume-sheet is laid out at. */
const SHEET_WIDTH = 794;
const SHEET_HEIGHT = 1123;

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #resume-print-area, #resume-print-area * { visibility: visible !important; }
  #resume-print-area {
    position: absolute !important;
    inset: 0 auto auto 0;
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    overflow: visible !important;
    box-shadow: none !important;
    background: #fff !important;
  }
  #resume-print-scale {
    transform: none !important;
    width: auto !important;
    margin-bottom: 0 !important;
  }
  @page { margin: 12mm; }
}
`;

const ACTION_VERBS = [
  "built", "led", "shipped", "designed", "cut", "grew", "raised", "reduced",
  "launched", "migrated", "automated", "scaled", "improved", "owned",
  "delivered", "created", "rewrote", "fixed", "saved", "increased",
];

interface AtsCheck {
  label: string;
  state: "pass" | "warn" | "fail";
  note: string;
}

/** What an applicant tracking system can and cannot read from this resume. */
function auditAts(content: ResumeContent, template: string): AtsCheck[] {
  const c = content ?? {};
  const experience = c.experience ?? [];
  const skills = c.skills ?? [];
  const bullets = experience.flatMap((e) => e.bullets ?? []);
  const datedRoles = experience.filter((e) => e.startDate).length;
  const quantified = bullets.filter((b) => /\d/.test(b)).length;
  const weakOpeners = bullets.filter(
    (b) => !ACTION_VERBS.includes(b.trim().split(/\s+/)[0]?.toLowerCase() ?? "")
  ).length;

  const twoColumn = template === "professional";
  const darkHeader = template === "modern";

  return [
    {
      label: "Single-column layout",
      state: twoColumn ? "fail" : darkHeader ? "warn" : "pass",
      note: twoColumn
        ? "Two-column layouts get scrambled by most parsers. Classic or Minimal is safer."
        : darkHeader
          ? "White text on a dark header sometimes fails to extract."
          : "Parsers read this top to bottom without scrambling anything.",
    },
    {
      label: "Contact details in plain text",
      state: c.contact?.email && c.contact?.phone ? "pass" : "fail",
      note:
        c.contact?.email && c.contact?.phone
          ? "Email and phone will be picked up automatically."
          : "Missing email or phone. Many systems reject a resume without both.",
    },
    {
      label: "Dated work history",
      state:
        experience.length === 0
          ? "fail"
          : datedRoles === experience.length
            ? "pass"
            : "warn",
      note:
        experience.length === 0
          ? "No roles listed, so years of experience cannot be calculated."
          : datedRoles === experience.length
            ? "Every role has a start date."
            : `${experience.length - datedRoles} role${experience.length - datedRoles === 1 ? "" : "s"} missing a start date.`,
    },
    {
      label: "Enough skill keywords",
      state: skills.length >= 8 ? "pass" : skills.length >= 4 ? "warn" : "fail",
      note:
        skills.length >= 8
          ? `${skills.length} keywords indexed.`
          : `Only ${skills.length} keyword${skills.length === 1 ? "" : "s"}. Filters usually look for eight or more.`,
    },
    {
      label: "Measurable achievements",
      state: quantified >= 3 ? "pass" : quantified >= 1 ? "warn" : "fail",
      note:
        quantified >= 3
          ? `${quantified} bullets carry a number.`
          : "Add volume, percentage or time saved to your strongest lines.",
    },
    {
      label: "Strong bullet openers",
      state: bullets.length === 0 ? "fail" : weakOpeners === 0 ? "pass" : "warn",
      note:
        bullets.length === 0
          ? "No achievement lines yet."
          : weakOpeners === 0
            ? "Every line opens with an action verb."
            : `${weakOpeners} line${weakOpeners === 1 ? "" : "s"} start weakly. Open with built, led, cut and the like.`,
    },
  ];
}

/** Renders the A4 sheet scaled down so the whole page is visible. */
function ScaledPreview({
  template,
  content,
}: {
  template: string;
  content: ResumeContent;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const fit = () => {
      const width = frame.clientWidth;
      if (width > 0) setScale(Math.min(1, width / SHEET_WIDTH));
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="w-full overflow-hidden">
      <div
        id="resume-print-scale"
        style={{
          width: SHEET_WIDTH,
          minHeight: SHEET_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          marginBottom: `${-SHEET_HEIGHT * (1 - scale)}px`,
        }}
        className="bg-white"
      >
        <ResumeTemplate template={template} content={content} />
      </div>
    </div>
  );
}

export default function ResumeEditorPage() {
  const params = useParams<{ id: string }>();
  const resumeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [resume, setResume] = useState<Resume | null>(null);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("classic");
  const [content, setContent] = useState<ResumeContent>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [panel, setPanel] = useState<"ats" | "ai">("ats");
  const [openSection, setOpenSection] = useState<string>("contact");

  const [review, setReview] = useState<Review | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const firstLoad = useRef(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/resumes/${resumeId}`);
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
  }, [resumeId]);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setDirty(true);
  }, [title, template, content]);

  useEffect(() => {
    if (!dirty) return;

    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      await api.put(`/resumes/${resumeId}`, { title, template, content });
      setDirty(false);
      setMessage("Saved");
      window.setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }, [resumeId, title, template, content]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function runReview() {
    setReviewing(true);
    setError("");
    setPanel("ai");

    try {
      await save();
      const { data } = await api.post("/ai/resume-review", { resumeId });
      setReview(data.review);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The review could not be completed.");
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

  const atsChecks = useMemo(() => auditAts(content, template), [content, template]);
  const atsScore = useMemo(() => {
    const points = atsChecks.reduce(
      (sum, c) => sum + (c.state === "pass" ? 1 : c.state === "warn" ? 0.5 : 0),
      0
    );
    return Math.round((points / atsChecks.length) * 100);
  }, [atsChecks]);

  const sectionState = useMemo(
    () =>
      ({
        contact: Boolean(content.contact?.email && content.contact?.phone),
        summary: (content.summary ?? "").trim().length >= 60,
        skills: (content.skills ?? []).length >= 5,
        experience: (content.experience ?? []).length > 0,
        education: (content.education ?? []).length > 0,
      }) as Record<string, boolean>,
    [content]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-6 py-12 text-sm text-ink-soft">
        Loading resume…
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="mx-auto max-w-[1600px] px-6 py-12">
        <p className="text-sm text-alert">{error || "Resume not found."}</p>
        <Link href="/resumes" className="mt-3 inline-block text-sm text-brand hover:underline">
          Back to resumes
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";
  const microLabel = "mb-1 block text-xs text-ink-faint";

  const atsTone = atsScore >= 80 ? "text-fit" : atsScore >= 55 ? "text-locked" : "text-alert";
  const atsBar = atsScore >= 80 ? "bg-fit" : atsScore >= 55 ? "bg-locked" : "bg-alert";

  /** One accordion section, so only what you are editing is open. */
  function Section({
    id,
    title: heading,
    hint,
    children,
  }: {
    id: string;
    title: string;
    hint?: string;
    children: React.ReactNode;
  }) {
    const open = openSection === id;

    return (
      <section className="overflow-hidden rounded-card border border-line bg-paper">
        <button
          onClick={() => setOpenSection(open ? "" : id)}
          className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-shell/50"
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              sectionState[id] ? "bg-fit" : "bg-locked"
            }`}
          />
          <span className="flex-1 font-display text-base font-600 text-ink">{heading}</span>
          {hint && <span className="truncate text-xs text-ink-faint">{hint}</span>}
          <ChevronDown
            size={16}
            className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && <div className="border-t border-line px-5 py-4">{children}</div>}
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      <style>{PRINT_CSS}</style>

      {/* ---------------- toolbar ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-paper px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/resumes"
            title="All resumes"
            className="shrink-0 rounded border border-line p-1.5 text-ink-faint hover:bg-shell hover:text-ink"
          >
            <ArrowLeft size={15} />
          </Link>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-display text-lg font-600 text-ink focus:outline-none"
          />

          {dirty ? (
            <span className="shrink-0 text-xs text-locked">Unsaved</span>
          ) : (
            message && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-fit">
                <Check size={13} />
                {message}
              </span>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="rounded border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
          >
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
                {t.atsSafe ? "" : " — not ATS safe"}
              </option>
            ))}
          </select>

          <Link
            href={`/resumes/${resumeId}/preview`}
            className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-shell"
          >
            Full preview
          </Link>

          <button
            onClick={() => window.print()}
            title="Print or save as PDF"
            className="rounded border border-line p-1.5 text-ink-soft hover:bg-shell hover:text-ink"
          >
            <Printer size={15} />
          </button>

          <button
            onClick={runReview}
            disabled={reviewing}
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-shell disabled:opacity-60"
          >
            <Sparkles size={15} />
            {reviewing ? "Reviewing…" : "AI review"}
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-brand px-4 py-1.5 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {/* ---------------- editor | sheet | panel ---------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        {/* ---- form ---- */}
        <div className="space-y-2.5">
          <Section
            id="contact"
            title="Contact"
            hint={content.contact?.email ? content.contact.email : "Not set"}
          >
            <div className="grid gap-3 sm:grid-cols-2">
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
          </Section>

          <Section
            id="summary"
            title="Summary"
            hint={`${(content.summary ?? "").trim().length} characters`}
          >
            <textarea
              value={content.summary ?? ""}
              onChange={(e) => patch({ summary: e.target.value })}
              rows={5}
              placeholder="Three or four lines on what you do and what you are looking for."
              className={inputClass}
            />
            {(content.summary ?? "").trim().length < 60 && (
              <p className="mt-1.5 text-xs text-locked">
                Short summaries get skipped. Aim for two or three full sentences.
              </p>
            )}
          </Section>

          <Section
            id="skills"
            title="Skills"
            hint={`${(content.skills ?? []).length} added`}
          >
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
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-ink-faint">
              Separate with commas. Filters usually look for eight or more.
            </p>

            {(content.skills ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(content.skills ?? []).map((skill) => (
                  <span key={skill} className="rounded bg-shell px-2 py-0.5 text-xs text-ink">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section
            id="experience"
            title="Experience"
            hint={`${(content.experience ?? []).length} role${(content.experience ?? []).length === 1 ? "" : "s"}`}
          >
            <div className="space-y-4">
              {(content.experience ?? []).map((item, index) => {
                const bullets = item.bullets ?? [];
                const weak = bullets.filter(
                  (b) =>
                    !ACTION_VERBS.includes(b.trim().split(/\s+/)[0]?.toLowerCase() ?? "")
                ).length;
                const noNumbers = bullets.length > 0 && !bullets.some((b) => /\d/.test(b));

                return (
                  <div key={index} className="rounded border border-line p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-ink-faint">
                        {item.title || item.company || `Role ${index + 1}`}
                      </span>
                      <button
                        onClick={() =>
                          patch({
                            experience: (content.experience ?? []).filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                        className="rounded p-1 text-ink-faint hover:text-alert"
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={microLabel}>Job title</label>
                        <input
                          value={item.title}
                          onChange={(e) => updateExperience(index, { title: e.target.value })}
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
                      <label className={microLabel}>Achievements — one per line</label>
                      <textarea
                        value={bullets.join("\n")}
                        onChange={(e) =>
                          updateExperience(index, {
                            bullets: e.target.value.split("\n").filter(Boolean),
                          })
                        }
                        rows={4}
                        placeholder="Cut page load from 4s to 1.2s by caching the product feed"
                        className={inputClass}
                      />

                      {(weak > 0 || noNumbers) && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-locked">
                          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                          {weak > 0 && noNumbers
                            ? "Open each line with a verb and work a number into at least one."
                            : weak > 0
                              ? `${weak} line${weak === 1 ? "" : "s"} do not start with an action verb.`
                              : "No numbers here. Recruiters scan for scale and impact."}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() =>
                  patch({
                    experience: [
                      ...(content.experience ?? []),
                      { company: "", title: "", bullets: [] },
                    ],
                  })
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-line py-2.5 text-sm text-ink-soft hover:bg-shell hover:text-ink"
              >
                <Plus size={14} />
                Add a role
              </button>
            </div>
          </Section>

          <Section
            id="education"
            title="Education"
            hint={`${(content.education ?? []).length} entr${(content.education ?? []).length === 1 ? "y" : "ies"}`}
          >
            <div className="space-y-4">
              {(content.education ?? []).map((item, index) => (
                <div key={index} className="rounded border border-line p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-ink-faint">
                      {item.degree || item.institution || `Entry ${index + 1}`}
                    </span>
                    <button
                      onClick={() =>
                        patch({
                          education: (content.education ?? []).filter((_, i) => i !== index),
                        })
                      }
                      className="rounded p-1 text-ink-faint hover:text-alert"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={microLabel}>Degree</label>
                      <input
                        value={item.degree}
                        onChange={(e) => updateEducation(index, { degree: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={microLabel}>Field</label>
                      <input
                        value={item.field ?? ""}
                        onChange={(e) => updateEducation(index, { field: e.target.value })}
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
                        onChange={(e) => updateEducation(index, { startYear: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={microLabel}>End year</label>
                      <input
                        value={String(item.endYear ?? "")}
                        onChange={(e) => updateEducation(index, { endYear: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  patch({
                    education: [
                      ...(content.education ?? []),
                      { institution: "", degree: "" },
                    ],
                  })
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-line py-2.5 text-sm text-ink-soft hover:bg-shell hover:text-ink"
              >
                <Plus size={14} />
                Add education
              </button>
            </div>
          </Section>
        </div>

        {/* ---- live sheet ---- */}
        <div>
          <div className="sticky top-20">
            <div className="flex items-center justify-between rounded-t-card border border-b-0 border-line bg-paper px-3 py-2">
              <span className="text-xs text-ink-faint">
                Live preview — {TEMPLATES.find((t) => t.value === template)?.label}
              </span>
              <Link
                href={`/resumes/${resumeId}/preview`}
                className="text-xs text-brand hover:underline"
              >
                Open full size
              </Link>
            </div>

            <div
              id="resume-print-area"
              className="max-h-[calc(100vh-11rem)] overflow-y-auto rounded-b-card border border-line bg-white shadow-sm"
            >
              <ScaledPreview template={template} content={content} />
            </div>
          </div>
        </div>

        {/* ---- side panel ---- */}
        <aside>
          <div className="sticky top-20 overflow-hidden rounded-card border border-line bg-paper">
            <div className="flex border-b border-line">
              <button
                onClick={() => setPanel("ats")}
                className={`flex-1 border-b-2 px-3 py-2.5 text-sm ${
                  panel === "ats"
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                ATS check
              </button>
              <button
                onClick={() => setPanel("ai")}
                className={`flex-1 border-b-2 px-3 py-2.5 text-sm ${
                  panel === "ai"
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                AI review
              </button>
            </div>

            <div className="max-h-[calc(100vh-13rem)] overflow-y-auto p-5">
              {panel === "ats" ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                      <ShieldCheck size={15} className={atsTone} />
                      Machine readability
                    </span>
                    <span className={`font-display text-2xl font-700 ${atsTone}`}>
                      {atsScore}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-shell">
                    <div className={`h-full ${atsBar}`} style={{ width: `${atsScore}%` }} />
                  </div>

                  <ul className="mt-4 space-y-3">
                    {atsChecks.map((check) => (
                      <li key={check.label}>
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${
                              check.state === "pass"
                                ? "bg-fit"
                                : check.state === "warn"
                                  ? "bg-locked"
                                  : "bg-alert"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-ink">{check.label}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">
                              {check.note}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : review ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink-soft">Asha&apos;s score</span>
                    <span className="font-display text-2xl font-700 text-ink">
                      {review.score}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {review.summary}
                  </p>

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
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                        {review.rewrittenSummary}
                      </p>
                      <button
                        onClick={() => {
                          patch({ summary: review.rewrittenSummary });
                          setOpenSection("summary");
                        }}
                        className="mt-2 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-shell"
                      >
                        Use this
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-6 text-center">
                  <Sparkles size={20} className="mx-auto text-brand" />
                  <p className="mt-2 text-sm text-ink">
                    Asha can read this resume and tell you what to fix.
                  </p>
                  <button
                    onClick={runReview}
                    disabled={reviewing}
                    className="mt-3 rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
                  >
                    {reviewing ? "Reading…" : "Run the review"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}