"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import api from "@/lib/api";
import ResumeTemplate from "@/components/ResumeTemplates";
import type { Resume } from "@/types";

const TEMPLATES = ["classic", "professional", "modern", "minimal"];

export default function ResumePreviewPage() {
  const params = useParams<{ id: string }>();

  const [resume, setResume] = useState<Resume | null>(null);
  const [template, setTemplate] = useState("classic");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/resumes/${params.id}`);
        setResume(data.resume);
        setTemplate(data.resume.template);
      } catch {
        setError("Could not load this resume.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id]);

  async function saveTemplate(next: string) {
    setTemplate(next);
    try {
      await api.put(`/resumes/${params.id}`, { template: next });
    } catch {
      // keep the preview switched even if the save fails
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-alert">{error || "Resume not found."}</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="print-hide mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href={`/resumes/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={15} />
          Back to editor
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded border border-line">
            {TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => saveTemplate(t)}
                className={`px-3 py-1.5 text-sm capitalize ${
                  template === t
                    ? "bg-brand text-paper"
                    : "bg-paper text-ink-soft hover:bg-shell"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep"
          >
            <Printer size={15} />
            Save as PDF
          </button>
        </div>
      </div>

      <div className="mx-auto w-fit shadow-lg print:shadow-none">
        <ResumeTemplate template={template} content={resume.content ?? {}} />
      </div>

      <p className="print-hide mx-auto mt-4 max-w-[210mm] px-4 text-sm text-ink-faint">
        The print dialog opens — choose &quot;Save as PDF&quot; as the destination.
      </p>
    </div>
  );
}