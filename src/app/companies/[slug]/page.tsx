"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  MapPin,
  Users,
  Building2,
} from "lucide-react";
import api, { formatSalary, timeAgo } from "@/lib/api";

interface CompanyJob {
  id: string;
  title: string;
  slug: string;
  jobType: string;
  city: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceLevel: string;
  createdAt: string;
}

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  about: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isVerified: boolean;
  createdAt: string;
  jobs: CompanyJob[];
}

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

export default function CompanyDetailPage() {
  const params = useParams<{ slug: string }>();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/companies/${params.slug}`);
        setCompany(data.company);
      } catch {
        setError("This company could not be found.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-alert">{error || "Company not found."}</p>
        <Link
          href="/companies"
          className="mt-3 inline-block text-sm text-brand hover:underline"
        >
          All companies
        </Link>
      </div>
    );
  }

  const location =
    [company.city, company.state, company.country].filter(Boolean).join(", ") ||
    "Location not set";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/companies"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} />
        All companies
      </Link>

      <div className="mt-4 rounded-card border border-line bg-paper p-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl text-ink">{company.name}</h1>
          {company.isVerified && <BadgeCheck size={18} className="text-fit" />}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
          {company.industry && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} className="text-ink-faint" />
              {company.industry}
            </span>
          )}
          {company.size && (
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-ink-faint" />
              {company.size} people
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-ink-faint" />
            {location}
          </span>
        </div>

        {company.website && (
          <Link
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            {company.website.replace(/^https?:\/\//, "")}
            <ExternalLink size={13} />
          </Link>
        )}

        {company.about && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {company.about}
          </p>
        )}

        <p className="mt-4 text-xs text-ink-faint">
          On the portal since{" "}
          {new Date(company.createdAt).toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <section className="mt-6 mb-10">
        <h2 className="text-lg text-ink">
          Open jobs
          <span className="ml-2 text-sm font-normal text-ink-soft">
            {company.jobs.length}
          </span>
        </h2>

        <div className="mt-3 overflow-hidden rounded-card border border-line">
          {company.jobs.length === 0 ? (
            <div className="bg-paper p-10 text-center">
              <p className="text-sm text-ink">
                This company has no open jobs right now.
              </p>
              <Link
                href="/jobs"
                className="mt-3 inline-block text-sm text-brand hover:underline"
              >
                Browse other jobs
              </Link>
            </div>
          ) : (
            company.jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.slug}`}
                className="block border-b border-line bg-paper p-5 last:border-b-0 hover:bg-shell/60"
              >
                <h3 className="text-base font-600 text-ink">{job.title}</h3>

                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} className="text-ink-faint" />
                    {job.isRemote ? "Remote" : job.city || "Location not set"}
                  </span>
                  <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                  <span className="rounded bg-shell px-2 py-0.5 text-xs">
                    {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
                  </span>
                </div>

                <p className="mt-2 text-xs text-ink-faint">
                  Posted {timeAgo(job.createdAt)}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}