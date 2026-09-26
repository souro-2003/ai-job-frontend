import Link from "next/link";
import { ArrowRight, FileText, Target, Mic } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Build your resume",
    body: "Fill your profile once. The builder turns it into a formatted resume you can reuse for every application.",
  },
  {
    icon: Target,
    title: "See your match score",
    body: "Every job shows how closely it fits your skills, experience and location — and exactly which skills you are missing.",
  },
  {
    icon: Mic,
    title: "Ask the assistant",
    body: "Talk or type. Asha reads your profile and tells you what to fix, what to learn, and which roles to target.",
  },
];

export default function Home() {
  return (
    <div className="bg-shell">
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl leading-[1.1] text-ink md:text-6xl">
              Stop guessing which jobs will call you back.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Every job on this portal is scored against your actual skills and
              experience. You see the number before you apply — and what to fix
              if it is low.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded bg-brand px-5 py-2.5 text-sm font-medium text-paper hover:bg-brand-deep"
              >
                Create your account
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/jobs"
                className="rounded border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-shell"
              >
                Browse jobs first
              </Link>
            </div>

            <p className="mt-4 text-sm text-ink-faint">
              Browsing is free. A paid plan is needed to save a resume and apply.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl text-ink">How it works</h2>

        <div className="mt-8 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="bg-paper p-6">
              <step.icon size={20} className="text-brand" />
              <h3 className="mt-4 text-base font-600 text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-card border border-line bg-paper p-8 md:flex md:items-center md:justify-between md:gap-8">
          <div className="max-w-xl">
            <h2 className="text-2xl text-ink">Hiring instead?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Post a role and see applicants ranked by how well they match it,
              with their skills, notice period and expected salary on the same
              screen.
            </p>
          </div>
          <Link
            href="/signup?role=employer"
            className="mt-5 inline-flex shrink-0 items-center gap-2 rounded border border-brand px-5 py-2.5 text-sm font-medium text-brand hover:bg-shell md:mt-0"
          >
            Post a job
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-faint md:flex-row md:items-center md:justify-between">
          <span>AI Job Assistance Portal</span>
          <div className="flex gap-5">
            <Link href="/jobs" className="hover:text-ink">
              Jobs
            </Link>
            <Link href="/companies" className="hover:text-ink">
              Companies
            </Link>
            <Link href="/pricing" className="hover:text-ink">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}