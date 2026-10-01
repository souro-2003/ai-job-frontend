"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, ShieldCheck, ShieldAlert, Check } from "lucide-react";
import api from "@/lib/api";
import ResumeTemplate from "@/components/ResumeTemplates";
import type { Resume } from "@/types";

const TEMPLATES = [
  { value: "classic", label: "Classic", atsSafe: true },
  { value: "professional", label: "Professional", atsSafe: false },
  { value: "modern", label: "Modern", atsSafe: false },
  { value: "minimal", label: "Minimal", atsSafe: true },
];

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #resume-sheet, #resume-sheet * { visibility: visible !important; }
  #resume-sheet {
    position: absolute !important;
    inset: 0 auto auto 0;
    width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
  @page { margin: 12mm; }
}
`;

export default function ResumePreviewPage() {
  const params = useParams<{ id: string }>();
  const resumeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [resume, setResume] = useState<Resume | null>(null);
  const [template, setTemplate] = useState("classic");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/resumes/${resumeId}`);
        setResume(data.resume);
        setTemplate(data.resume.template);
      } catch {
        setError("Could not load this resume.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [resumeId]);

  async function saveTemplate(next: string) {
    setTemplate(next);
    setSaved(false);

    try {
      await api.put(`/resumes/${resumeId}`, { template: next });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      // The preview stays switched even if the save fails.
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <p className="text-sm text-alert">{error || "Resume not found."}</p>
        <Link href="/resumes" className="mt-3 inline-block text-sm text-brand hover:underline">
          Back to resumes
        </Link>
      </div>
    );
  }

  const current = TEMPLATES.find((t) => t.value === template);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-5">
      <style>{PRINT_CSS}</style>

      {/* ---------------- toolbar ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-paper px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/resumes/${resumeId}`}
            title="Back to editor"
            className="shrink-0 rounded border border-line p-1.5 text-ink-faint hover:bg-shell hover:text-ink"
          >
            <ArrowLeft size={15} />
          </Link>

          <span className="min-w-0 truncate font-display text-lg font-600 text-ink">
            {resume.title}
          </span>

          {saved && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-fit">
              <Check size={13} />
              Template saved
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded border border-line">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                onClick={() => saveTemplate(t.value)}
                className={`px-3 py-1.5 text-sm ${
                  template === t.value
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink-soft hover:bg-shell hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Link
            href={`/resumes/${resumeId}`}
            className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-shell"
          >
            Edit
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded bg-brand px-4 py-1.5 text-sm font-medium text-paper hover:bg-brand-deep"
          >
            <Printer size={15} />
            Save as PDF
          </button>
        </div>
      </div>

      {/* Layout warning only when the chosen template actually carries a risk. */}
      {current && !current.atsSafe && (
        <div className="mt-3 flex items-start gap-2.5 rounded-card border border-locked/30 bg-locked-soft px-4 py-3">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-locked" />
          <p className="text-sm text-ink-soft">
            {template === "professional"
              ? "This layout puts skills in a sidebar. It reads beautifully to a person, but many applicant tracking systems scramble two columns. Use Classic or Minimal when a company asks you to upload rather than email."
              : "The dark header can fail to extract as text in some applicant tracking systems. Fine when a person reads your PDF, riskier on an upload form."}
          </p>
        </div>
      )}

      {current?.atsSafe && (
        <div className="mt-3 flex items-center gap-2.5 rounded-card border border-line bg-paper px-4 py-2.5">
          <ShieldCheck size={16} className="shrink-0 text-fit" />
          <p className="text-sm text-ink-soft">
            Single column, standard headings. Safe to upload anywhere.
          </p>
        </div>
      )}

      {/* ---------------- the sheet ---------------- */}
      <div className="mt-4 overflow-x-auto pb-10">
        <div
          id="resume-sheet"
          className="mx-auto w-fit bg-white shadow-lg print:shadow-none"
        >
          <ResumeTemplate template={template} content={resume.content ?? {}} />
        </div>
      </div>

      <p className="mx-auto max-w-[210mm] pb-8 text-center text-sm text-ink-faint">
        The print dialog opens — pick &quot;Save as PDF&quot; as the destination, and
        leave margins at default.
      </p>
    </div>
  );
}