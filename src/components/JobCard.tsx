import Link from "next/link";
import { MapPin, Briefcase, Users } from "lucide-react";
import { formatSalary, timeAgo } from "@/lib/api";
import type { Job } from "@/types";

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

function scoreStyle(total: number): string {
  if (total >= 70) return "bg-fit-soft text-fit";
  if (total >= 45) return "bg-locked-soft text-locked";
  return "bg-shell text-ink-soft";
}

export default function JobCard({ job }: { job: Job }) {
  const location = job.isRemote
    ? "Remote"
    : [job.city, job.state].filter(Boolean).join(", ") || "Location not set";

  // Admin-posted jobs carry no Company record, only a typed-in name.
  const companyLabel =
    job.company?.name ?? job.companyName ?? "Direct listing";

  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="block border-b border-line bg-paper p-5 last:border-b-0 hover:bg-shell/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-600 text-ink">{job.title}</h3>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {companyLabel}
            {job.company?.isVerified && (
              <span className="ml-1.5 text-fit" title="Verified company">
                ✓
              </span>
            )}
          </p>
        </div>

        {job.match && (
          <div
            className={`shrink-0 rounded px-2.5 py-1 text-sm font-600 ${scoreStyle(job.match.total)}`}
            title="How closely this job fits your profile"
          >
            {job.match.total}% fit
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} className="text-ink-faint" />
          {location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Briefcase size={14} className="text-ink-faint" />
          {job.minExperience}
          {job.maxExperience ? `–${job.maxExperience}` : "+"} yrs
        </span>
        <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
        <span className="rounded bg-shell px-2 py-0.5 text-xs">
          {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
        </span>
      </div>

      {job.match && job.match.missingSkills.length > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Missing:{" "}
          <span className="text-locked">
            {job.match.missingSkills.slice(0, 4).join(", ")}
            {job.match.missingSkills.length > 4 &&
              ` +${job.match.missingSkills.length - 4} more`}
          </span>
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-ink-faint">
        <span>{timeAgo(job.createdAt)}</span>
        {job._count && (
          <span className="inline-flex items-center gap-1">
            <Users size={12} />
            {job._count.applications} applied
          </span>
        )}
      </div>
    </Link>
  );
}