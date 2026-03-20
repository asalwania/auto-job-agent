import type {
  BaseResume,
  JobSource,
  JobStatus,
  RoleLevel,
  ResponseStatus,
} from '.';

// ============================================================
// Row types — use `type` (not `interface`) so they satisfy
// Record<string, unknown> which Supabase generics require.
// ============================================================

export type JobRow = {
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
};

export type TailoredResumeRow = {
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
};

export type ApplicationRow = {
  id: string;
  job_id: string;
  tailored_resume_id: string | null;
  cover_letter: string | null;
  applied_at: string | null;
  response_status: string;
  notes: string | null;
  created_at: string;
};

export type BaseResumeRow = {
  id: string;
  name: string;
  data: BaseResume;
  is_active: boolean;
  created_at: string;
};

export type ScrapeLogRow = {
  id: string;
  source: string | null;
  jobs_found: number;
  jobs_new: number;
  errors: unknown[];
  ran_at: string;
};

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

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: JobRow;
        Insert: JobInsert;
        Update: JobUpdate;
        Relationships: [];
      };
      tailored_resumes: {
        Row: TailoredResumeRow;
        Insert: TailoredResumeInsert;
        Update: TailoredResumeUpdate;
        Relationships: [
          {
            foreignKeyName: 'tailored_resumes_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tailored_resumes_base_resume_id_fkey';
            columns: ['base_resume_id'];
            isOneToOne: false;
            referencedRelation: 'base_resumes';
            referencedColumns: ['id'];
          },
        ];
      };
      applications: {
        Row: ApplicationRow;
        Insert: ApplicationInsert;
        Update: ApplicationUpdate;
        Relationships: [
          {
            foreignKeyName: 'applications_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'applications_tailored_resume_id_fkey';
            columns: ['tailored_resume_id'];
            isOneToOne: false;
            referencedRelation: 'tailored_resumes';
            referencedColumns: ['id'];
          },
        ];
      };
      base_resumes: {
        Row: BaseResumeRow;
        Insert: BaseResumeInsert;
        Update: BaseResumeUpdate;
        Relationships: [];
      };
      scrape_logs: {
        Row: ScrapeLogRow;
        Insert: ScrapeLogInsert;
        Update: ScrapeLogUpdate;
        Relationships: [];
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
};
