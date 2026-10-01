export type Role = "CANDIDATE" | "EMPLOYER" | "ADMIN";
export type PlanTier = "FREE" | "BASIC" | "PRO";
export type SubscriptionStatus = "INACTIVE" | "ACTIVE" | "EXPIRED" | "CANCELLED";
export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "REMOTE";
export type ExperienceLevel = "FRESHER" | "JUNIOR" | "MID" | "SENIOR" | "LEAD";
export type ApplicationStatus =
  | "APPLIED"
  | "VIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED";
export type CompanyStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  createdAt?: string;
  lastLoginAt?: string | null;
  subscription?: {
    status: SubscriptionStatus;
    expiresAt: string | null;
    plan: { tier: PlanTier; name: string };
  } | null;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

export interface CandidateSkill {
  skillId: string;
  proficiency: number;
  years: number;
  skill: Skill;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  startYear: number;
  endYear: number | null;
  grade: string | null;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface CandidateProfile {
  id: string;
  headline: string | null;
  summary: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  experienceYears: number;
  experienceLevel: ExperienceLevel;
  currentTitle: string | null;
  expectedSalary: number | null;
  noticePeriodDays: number | null;
  openToRemote: boolean;
  avatarUrl: string | null;
  profileScore: number;
  skills: CandidateSkill[];
  educations: Education[];
  experiences: Experience[];
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website?: string | null;
  industry: string | null;
  size: string | null;
  about?: string | null;
  city: string | null;
  state: string | null;
  status?: CompanyStatus;
  isVerified: boolean;
  _count?: { jobs: number };
}

export interface MatchBreakdown {
  total: number;
  skills: number;
  experience: number;
  location: number;
  title: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface Job {
  id: string;
  title: string;
  slug: string;
  description?: string;
  responsibilities?: string | null;
  requirements?: string | null;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  minExperience: number;
  maxExperience: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  city: string | null;
  state: string | null;
  isRemote: boolean;
  vacancies: number;
  views: number;
  isActive?: boolean;
  isFeatured?: boolean;
  expiresAt?: string | null;
  createdAt: string;

  /**
   * Null for jobs the admin posted directly — those carry companyName instead.
   * Always read it as job.company?.name ?? job.companyName.
   */
  company: Company | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  applyUrl?: string | null;
  displayCompany?: string;

  skills: Array<{
    skillId: string;
    isRequired: boolean;
    weight: number;
    skill: { id: string; name: string };
  }>;
  _count?: { applications: number };
  match?: MatchBreakdown;
}

/** Why the apply button is locked for this candidate, from GET /jobs/:slug. */
export interface ApplyAccess {
  canApply: boolean;
  reason: "NO_ACTIVE_PLAN" | "APPLY_LIMIT_REACHED" | "RESUME_REQUIRED" | null;
  planName: string | null;
  planTier: PlanTier | null;
  appliesRemaining: number | null;
  hasResume: boolean;
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  matchScore: number;
  coverLetter: string | null;
  employerNote: string | null;
  createdAt: string;
  updatedAt?: string;
  job: Job;
}

export interface ResumeContent {
  contact?: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    bullets?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field?: string;
    startYear?: string | number;
    endYear?: string | number;
    grade?: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    link?: string;
    tech?: string[];
  }>;
  certifications?: Array<{ name: string; issuer?: string; year?: string | number }>;
  languages?: string[];
}

export interface Resume {
  id: string;
  title: string;
  template: string;
  content: ResumeContent;
  isPrimary: boolean;
  pdfUrl: string | null;
  downloads: number;
  createdAt: string;
  updatedAt: string;
  _count?: { applications: number };
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  priceInPaise: number;
  durationDays: number;
  resumeLimit: number;
  applyLimit: number;
  aiChatLimit: number;
  features: Record<string, unknown> | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}