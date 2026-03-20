import type {
  BaseResume,
  JobSource,
  JobStatus,
  RoleLevel,
  ResponseStatus,
} from '.';

// ============================================================
// Row types — match the SQL schema column-for-column
// ============================================================

export interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  jd_text: string | null;
  jd_hash: string | null;
  required_skills: string[];
  nice_to_have_skills: string[];
  experience_years: number | null;
  role_level: string;
  ats_score: number | null;
  status: string;
  scraped_at: string;
  updated_at: string;
}

export interface TailoredResumeRow {
  id: string;
  job_id: string;
  base_resume_id: string;
  tailored_bullets: Record<string, string[]> | null;
  tailored_summary: string | null;
  ats_score: number | null;
  missing_keywords: string[];
  covered_keywords: string[];
  pdf_path: string | null;
  created_at: string;
}

export interface ApplicationRow {
  id: string;
  job_id: string;
  tailored_resume_id: string | null;
  cover_letter: string | null;
  applied_at: string | null;
  response_status: string;
  notes: string | null;
  created_at: string;
}

export interface BaseResumeRow {
  id: string;
  name: string;
  data: BaseResume;
  is_active: boolean;
  created_at: string;
}

export interface ScrapeLogRow {
  id: string;
  source: string | null;
  jobs_found: number;
  jobs_new: number;
  errors: unknown[];
  ran_at: string;
}

// ============================================================
// Insert types — auto-generated columns are optional
// ============================================================

export type JobInsert = Omit<JobRow, 'id' | 'scraped_at' | 'updated_at'> & {
  id?: string;
  scraped_at?: string;
  updated_at?: string;
};

export type TailoredResumeInsert = Omit<TailoredResumeRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ApplicationInsert = Omit<ApplicationRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type BaseResumeInsert = Omit<BaseResumeRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ScrapeLogInsert = Omit<ScrapeLogRow, 'id' | 'ran_at'> & {
  id?: string;
  ran_at?: string;
};

// ============================================================
// Update types — everything optional
// ============================================================

export type JobUpdate = Partial<JobInsert>;
export type TailoredResumeUpdate = Partial<TailoredResumeInsert>;
export type ApplicationUpdate = Partial<ApplicationInsert>;
export type BaseResumeUpdate = Partial<BaseResumeInsert>;
export type ScrapeLogUpdate = Partial<ScrapeLogInsert>;

// ============================================================
// Supabase Database type
// ============================================================

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: JobRow;
        Insert: JobInsert;
        Update: JobUpdate;
      };
      tailored_resumes: {
        Row: TailoredResumeRow;
        Insert: TailoredResumeInsert;
        Update: TailoredResumeUpdate;
      };
      applications: {
        Row: ApplicationRow;
        Insert: ApplicationInsert;
        Update: ApplicationUpdate;
      };
      base_resumes: {
        Row: BaseResumeRow;
        Insert: BaseResumeInsert;
        Update: BaseResumeUpdate;
      };
      scrape_logs: {
        Row: ScrapeLogRow;
        Insert: ScrapeLogInsert;
        Update: ScrapeLogUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      job_source: JobSource;
      job_status: JobStatus;
      role_level: RoleLevel;
      response_status: ResponseStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
