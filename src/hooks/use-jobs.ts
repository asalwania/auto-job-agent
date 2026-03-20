'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

export interface JobsResponse {
  jobs: JobRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface JobDetailResponse {
  job: JobRow;
  tailoredResume: TailoredResumeRow | null;
}

export interface JobFilters {
  status?: string;
  source?: string;
  minScore?: number;
  page?: number;
  limit?: number;
}

function buildUrl(filters: JobFilters): string {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.source && filters.source !== 'all') params.set('source', filters.source);
  if (filters.minScore) params.set('minScore', String(filters.minScore));
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));
  return `/api/jobs?${params}`;
}

export function useJobs(filters: JobFilters) {
  const { data, error, isLoading, mutate } = useSWR<JobsResponse>(
    buildUrl(filters),
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 2000 },
  );

  return {
    jobs: data?.jobs ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useJobDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<JobDetailResponse>(
    id ? `/api/jobs/${id}` : null,
    fetcher,
  );

  return {
    job: data?.job ?? null,
    tailoredResume: data?.tailoredResume ?? null,
    isLoading,
    isError: !!error,
    mutate,
  };
}
