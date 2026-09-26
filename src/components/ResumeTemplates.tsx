import type { ResumeContent } from "@/types";

interface Props {
  content: ResumeContent;
}

function dateRange(start?: string, end?: string, isCurrent?: boolean): string {
  if (!start) return "";
  return `${start} — ${isCurrent ? "Present" : end || "Present"}`;
}

function ContactLine({ content }: Props) {
  const parts = [
    content.contact?.email,
    content.contact?.phone,
    content.contact?.location,
  ].filter(Boolean);

  return <>{parts.join("  ·  ")}</>;
}

/* ---------------- CLASSIC ---------------- */

export function ClassicTemplate({ content }: Props) {
  return (
    <div className="resume-sheet font-serif text-[10.5pt] leading-[1.45] text-black">
      <header className="border-b-2 border-black pb-3 text-center">
        <h1 className="text-[20pt] font-bold uppercase tracking-wide">
          {content.contact?.fullName || "Your Name"}
        </h1>
        <p className="mt-1.5 text-[9pt]">
          <ContactLine content={content} />
        </p>
        {(content.contact?.linkedin || content.contact?.portfolio) && (
          <p className="text-[9pt]">
            {[content.contact?.linkedin, content.contact?.portfolio]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        )}
      </header>

      {content.summary && (
        <section className="mt-4">
          <h2 className="border-b border-black pb-0.5 text-[11pt] font-bold uppercase">
            Profile
          </h2>
          <p className="mt-2">{content.summary}</p>
        </section>
      )}

      {content.experience && content.experience.length > 0 && (
        <section className="mt-4">
          <h2 className="border-b border-black pb-0.5 text-[11pt] font-bold uppercase">
            Experience
          </h2>
          {content.experience.map((item, i) => (
            <div key={i} className="mt-3">
              <div className="flex justify-between">
                <strong>{item.title}</strong>
                <span className="text-[9pt]">
                  {dateRange(item.startDate, item.endDate, item.isCurrent)}
                </span>
              </div>
              <div className="flex justify-between italic">
                <span>{item.company}</span>
                <span className="text-[9pt]">{item.location}</span>
              </div>
              {item.bullets && item.bullets.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {item.bullets.map((bullet, b) => (
                    <li key={b}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {content.education && content.education.length > 0 && (
        <section className="mt-4">
          <h2 className="border-b border-black pb-0.5 text-[11pt] font-bold uppercase">
            Education
          </h2>
          {content.education.map((item, i) => (
            <div key={i} className="mt-2 flex justify-between">
              <div>
                <strong>
                  {item.degree}
                  {item.field ? `, ${item.field}` : ""}
                </strong>
                <div className="italic">{item.institution}</div>
              </div>
              <div className="text-right text-[9pt]">
                <div>
                  {item.startYear} — {item.endYear || "Present"}
                </div>
                {item.grade && <div>{item.grade}</div>}
              </div>
            </div>
          ))}
        </section>
      )}

      {content.skills && content.skills.length > 0 && (
        <section className="mt-4">
          <h2 className="border-b border-black pb-0.5 text-[11pt] font-bold uppercase">
            Skills
          </h2>
          <p className="mt-2">{content.skills.join("  ·  ")}</p>
        </section>
      )}

      {content.projects && content.projects.length > 0 && (
        <section className="mt-4">
          <h2 className="border-b border-black pb-0.5 text-[11pt] font-bold uppercase">
            Projects
          </h2>
          {content.projects.map((item, i) => (
            <div key={i} className="mt-2">
              <strong>{item.name}</strong>
              {item.tech && item.tech.length > 0 && (
                <span className="italic"> — {item.tech.join(", ")}</span>
              )}
              {item.description && <p>{item.description}</p>}
            </div>
          ))}
        </section>
      )}

      {content.certifications && content.certifications.length > 0 && (
        <section className="mt-4">
          <h2 className="border-b border-black pb-0.5 text-[11pt] font-bold uppercase">
            Certifications
          </h2>
          <ul className="mt-2 list-disc pl-5">
            {content.certifications.map((item, i) => (
              <li key={i}>
                {item.name}
                {item.issuer ? `, ${item.issuer}` : ""}
                {item.year ? ` (${item.year})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------------- PROFESSIONAL ---------------- */

export function ProfessionalTemplate({ content }: Props) {
  return (
    <div className="resume-sheet flex gap-6 text-[10pt] leading-[1.45] text-black">
      <aside className="w-[32%] shrink-0 border-r border-neutral-300 pr-5">
        <h1 className="text-[16pt] font-bold leading-tight">
          {content.contact?.fullName || "Your Name"}
        </h1>

        <section className="mt-5">
          <h2 className="text-[9pt] font-bold uppercase tracking-wider text-neutral-500">
            Contact
          </h2>
          <div className="mt-2 space-y-1 break-words text-[9pt]">
            {content.contact?.email && <div>{content.contact.email}</div>}
            {content.contact?.phone && <div>{content.contact.phone}</div>}
            {content.contact?.location && <div>{content.contact.location}</div>}
            {content.contact?.linkedin && <div>{content.contact.linkedin}</div>}
            {content.contact?.portfolio && <div>{content.contact.portfolio}</div>}
          </div>
        </section>

        {content.skills && content.skills.length > 0 && (
          <section className="mt-5">
            <h2 className="text-[9pt] font-bold uppercase tracking-wider text-neutral-500">
              Skills
            </h2>
            <ul className="mt-2 space-y-0.5 text-[9.5pt]">
              {content.skills.map((skill, i) => (
                <li key={i}>{skill}</li>
              ))}
            </ul>
          </section>
        )}

        {content.education && content.education.length > 0 && (
          <section className="mt-5">
            <h2 className="text-[9pt] font-bold uppercase tracking-wider text-neutral-500">
              Education
            </h2>
            {content.education.map((item, i) => (
              <div key={i} className="mt-2 text-[9.5pt]">
                <div className="font-semibold">{item.degree}</div>
                {item.field && <div>{item.field}</div>}
                <div>{item.institution}</div>
                <div className="text-neutral-600">
                  {item.startYear} — {item.endYear || "Present"}
                  {item.grade ? ` · ${item.grade}` : ""}
                </div>
              </div>
            ))}
          </section>
        )}

        {content.certifications && content.certifications.length > 0 && (
          <section className="mt-5">
            <h2 className="text-[9pt] font-bold uppercase tracking-wider text-neutral-500">
              Certifications
            </h2>
            <ul className="mt-2 space-y-1 text-[9.5pt]">
              {content.certifications.map((item, i) => (
                <li key={i}>
                  {item.name}
                  {item.year ? ` (${item.year})` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        {content.languages && content.languages.length > 0 && (
          <section className="mt-5">
            <h2 className="text-[9pt] font-bold uppercase tracking-wider text-neutral-500">
              Languages
            </h2>
            <p className="mt-2 text-[9.5pt]">{content.languages.join(", ")}</p>
          </section>
        )}
      </aside>

      <main className="flex-1">
        {content.summary && (
          <section>
            <h2 className="text-[10pt] font-bold uppercase tracking-wider text-neutral-500">
              Profile
            </h2>
            <p className="mt-2">{content.summary}</p>
          </section>
        )}

        {content.experience && content.experience.length > 0 && (
          <section className="mt-5">
            <h2 className="text-[10pt] font-bold uppercase tracking-wider text-neutral-500">
              Experience
            </h2>
            {content.experience.map((item, i) => (
              <div key={i} className="mt-3.5">
                <div className="font-bold">{item.title}</div>
                <div className="flex justify-between text-[9.5pt] text-neutral-600">
                  <span>
                    {item.company}
                    {item.location ? ` · ${item.location}` : ""}
                  </span>
                  <span>{dateRange(item.startDate, item.endDate, item.isCurrent)}</span>
                </div>
                {item.bullets && item.bullets.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-4">
                    {item.bullets.map((bullet, b) => (
                      <li key={b}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {content.projects && content.projects.length > 0 && (
          <section className="mt-5">
            <h2 className="text-[10pt] font-bold uppercase tracking-wider text-neutral-500">
              Projects
            </h2>
            {content.projects.map((item, i) => (
              <div key={i} className="mt-2.5">
                <div className="font-bold">{item.name}</div>
                {item.tech && item.tech.length > 0 && (
                  <div className="text-[9pt] text-neutral-600">
                    {item.tech.join(" · ")}
                  </div>
                )}
                {item.description && <p className="mt-0.5">{item.description}</p>}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

/* ---------------- MODERN ---------------- */

export function ModernTemplate({ content }: Props) {
  return (
    <div className="resume-sheet !p-0 text-[10.5pt] leading-[1.5] text-black">
      <header className="bg-[#1d3c58] px-10 py-7 text-white">
        <h1 className="text-[22pt] font-semibold leading-tight">
          {content.contact?.fullName || "Your Name"}
        </h1>
        <p className="mt-1.5 text-[9.5pt] opacity-90">
          <ContactLine content={content} />
        </p>
      </header>

      <div className="px-10 py-7">
        {content.summary && <p className="text-[11pt]">{content.summary}</p>}

        {content.skills && content.skills.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[11pt] font-semibold text-[#1d3c58]">Skills</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {content.skills.map((skill, i) => (
                <span
                  key={i}
                  className="rounded bg-neutral-100 px-2 py-0.5 text-[9pt]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {content.experience && content.experience.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[11pt] font-semibold text-[#1d3c58]">Experience</h2>
            {content.experience.map((item, i) => (
              <div key={i} className="mt-3.5 border-l-2 border-neutral-200 pl-4">
                <div className="font-semibold">{item.title}</div>
                <div className="text-[9.5pt] text-neutral-600">
                  {item.company}
                  {item.location ? ` · ${item.location}` : ""} ·{" "}
                  {dateRange(item.startDate, item.endDate, item.isCurrent)}
                </div>
                {item.bullets && item.bullets.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-4">
                    {item.bullets.map((bullet, b) => (
                      <li key={b}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {content.education && content.education.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[11pt] font-semibold text-[#1d3c58]">Education</h2>
            {content.education.map((item, i) => (
              <div key={i} className="mt-2.5 border-l-2 border-neutral-200 pl-4">
                <div className="font-semibold">
                  {item.degree}
                  {item.field ? `, ${item.field}` : ""}
                </div>
                <div className="text-[9.5pt] text-neutral-600">
                  {item.institution} · {item.startYear} — {item.endYear || "Present"}
                  {item.grade ? ` · ${item.grade}` : ""}
                </div>
              </div>
            ))}
          </section>
        )}

        {content.projects && content.projects.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[11pt] font-semibold text-[#1d3c58]">Projects</h2>
            {content.projects.map((item, i) => (
              <div key={i} className="mt-2.5 border-l-2 border-neutral-200 pl-4">
                <div className="font-semibold">{item.name}</div>
                {item.description && <p>{item.description}</p>}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------------- MINIMAL ---------------- */

export function MinimalTemplate({ content }: Props) {
  return (
    <div className="resume-sheet text-[10.5pt] leading-[1.6] text-neutral-900">
      <h1 className="text-[18pt] font-medium">
        {content.contact?.fullName || "Your Name"}
      </h1>
      <p className="mt-1 text-[9.5pt] text-neutral-500">
        <ContactLine content={content} />
      </p>

      {content.summary && <p className="mt-6">{content.summary}</p>}

      {content.experience && content.experience.length > 0 && (
        <section className="mt-8">
          {content.experience.map((item, i) => (
            <div key={i} className="mt-5 first:mt-0">
              <div className="text-[9pt] text-neutral-500">
                {dateRange(item.startDate, item.endDate, item.isCurrent)}
              </div>
              <div className="mt-0.5 font-medium">
                {item.title}, {item.company}
              </div>
              {item.bullets && item.bullets.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {item.bullets.map((bullet, b) => (
                    <p key={b}>{bullet}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {content.education && content.education.length > 0 && (
        <section className="mt-8">
          {content.education.map((item, i) => (
            <div key={i} className="mt-3 first:mt-0">
              <div className="text-[9pt] text-neutral-500">
                {item.startYear} — {item.endYear || "Present"}
              </div>
              <div className="mt-0.5 font-medium">
                {item.degree}
                {item.field ? `, ${item.field}` : ""}
              </div>
              <div className="text-neutral-600">{item.institution}</div>
            </div>
          ))}
        </section>
      )}

      {content.skills && content.skills.length > 0 && (
        <section className="mt-8">
          <p className="text-neutral-600">{content.skills.join(", ")}</p>
        </section>
      )}
    </div>
  );
}

/* ---------------- SWITCH ---------------- */

export default function ResumeTemplate({
  template,
  content,
}: {
  template: string;
  content: ResumeContent;
}) {
  switch (template) {
    case "professional":
      return <ProfessionalTemplate content={content} />;
    case "modern":
      return <ModernTemplate content={content} />;
    case "minimal":
      return <MinimalTemplate content={content} />;
    default:
      return <ClassicTemplate content={content} />;
  }
}