// ── Enums & Literals ──────────────────────────────────────────────

export type JobSource =
  | 'linkedin'
  | 'naukri'
  | 'instahyre'
  | 'wellfound'
  | 'greenhouse'
  | 'lever';

export type JobStatus =
  | 'pending'
  | 'tailoring'
  | 'approved'
  | 'applying'
  | 'applied'
  | 'failed'
  | 'skipped';

export type RoleLevel = 'junior' | 'mid' | 'senior' | 'lead' | 'unknown';

export type ResponseStatus = 'applied' | 'viewed' | 'rejected' | 'interview' | 'offer';

export type RoleType = 'full-time' | 'contract' | 'remote' | 'hybrid' | 'onsite';

export type QueueJobType = 'scrape' | 'tailor' | 'apply';

// ── Core Entities ─────────────────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: JobSource;
  jdText: string;
  jdHash: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  experienceYears: number | null;
  roleLevel: RoleLevel;
  atsScore: number | null;
  status: JobStatus;
  scrapedAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  tailoredResumeUrl: string;
  tailoredResumePath: string;
  coverLetter: string;
  appliedAt: string;
  responseStatus: ResponseStatus;
  notes: string;
}

// ── Resume ────────────────────────────────────────────────────────

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationYear: number;
}

export interface Project {
  name: string;
  description: string;
  techStack: string[];
  url: string;
}

export interface BaseResume {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  projects: Project[];
}

// ── AI Analysis ───────────────────────────────────────────────────

export interface JDAnalysis {
  requiredSkills: string[];
  niceToHaveSkills: string[];
  experienceYears: number | null;
  roleLevel: RoleLevel;
  keywords: string[];
  companySummary: string;
  roleType: RoleType;
}

export interface TailoredResume {
  baseResumeId: string;
  jobId: string;
  tailoredBullets: Record<string, string[]>;
  tailoredSummary: string;
  atsScore: number;
  missingKeywords: string[];
  coveredKeywords: string[];
}

// ── Queue ─────────────────────────────────────────────────────────

export interface QueueJob {
  type: QueueJobType;
  payload: unknown;
  priority: number; // 1–10
}
