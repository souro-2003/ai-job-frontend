"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Star, Trash2, Lock } from "lucide-react";
import api, { ApiError, timeAgo } from "@/lib/api";
import type { Resume } from "@/types";

export default function ResumesPage() {
  const router = useRouter();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/resumes");
      setResumes(data.resumes);
    } catch {
      setError("Could not load your resumes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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
        setError(
          err instanceof ApiError ? err.message : "Could not create the resume."
        );
      }
    } finally {
      setCreating(false);
    }
  }

  async function makePrimary(id: string) {
    await api.patch(`/resumes/${id}/primary`);
    await load();
  }

  async function remove(id: string) {
    await api.delete(`/resumes/${id}`);
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">Your resumes</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Each application sends one of these. Keep the best one marked as
            primary.
          </p>
        </div>
        <button
          onClick={createResume}
          disabled={creating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded bg-brand px-4 py-2 text-sm font-medium text-paper hover:bg-brand-deep disabled:opacity-60"
        >
          <Plus size={15} />
          {creating ? "Creating…" : "New resume"}
        </button>
      </div>

      {locked && (
        <div className="mt-5 rounded-card border border-locked/30 bg-locked-soft p-5">
          <div className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 shrink-0 text-locked" />
            <div>
              <h2 className="text-base font-600 text-ink">{locked}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Your profile data is already saved. Pick a plan and the resume
                builder fills itself in from it.
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
        <p className="mt-5 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-card border border-line">
        {loading ? (
          <div className="bg-paper p-10 text-center text-sm text-ink-soft">
            Loading…
          </div>
        ) : resumes.length === 0 ? (
          <div className="bg-paper p-10 text-center">
            <FileText size={24} className="mx-auto text-ink-faint" />
            <p className="mt-3 text-sm text-ink">You have no resumes yet.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Fill in your profile first, then create a resume — it starts from
              what you already entered.
            </p>
            <Link
              href="/profile"
              className="mt-4 inline-block rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-shell"
            >
              Open profile
            </Link>
          </div>
        ) : (
          resumes.map((resume) => (
            <div
              key={resume.id}
              className="flex items-center justify-between gap-4 border-b border-line bg-paper p-5 last:border-b-0"
            >
              <Link href={`/resumes/${resume.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-600 text-ink">
                    {resume.title}
                  </h3>
                  {resume.isPrimary && (
                    <span className="rounded bg-fit-soft px-2 py-0.5 text-xs font-medium text-fit">
                      Primary
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {resume.template} template · updated {timeAgo(resume.updatedAt)}
                  {resume._count && resume._count.applications > 0 &&
                    ` · used in ${resume._count.applications} applications`}
                </p>
              </Link>

              <div className="flex shrink-0 items-center gap-1">
                {!resume.isPrimary && (
                  <button
                    onClick={() => makePrimary(resume.id)}
                    className="p-1.5 text-ink-faint hover:text-fit"
                    title="Make primary"
                  >
                    <Star size={16} />
                  </button>
                )}
                <button
                  onClick={() => remove(resume.id)}
                  className="p-1.5 text-ink-faint hover:text-alert"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}