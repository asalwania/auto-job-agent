import { createServiceClient } from './client';
import type { JobRow, JobInsert } from '@/types/database';

// ── Filters ───────────────────────────────────────────────────────

export interface JobFilters {
  status?: string;
  source?: string;
  minAtsScore?: number;
}

// ── Helpers ───────────────────────────────────────────────────────

function db() {
  return createServiceClient().from('jobs');
}

// ── Queries ───────────────────────────────────────────────────────

export async function getJobs(filters?: JobFilters): Promise<JobRow[]> {
  try {
    let query = db().select('*').order('scraped_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.source) {
      query = query.eq('source', filters.source);
    }
    if (filters?.minAtsScore != null) {
      query = query.gte('ats_score', filters.minAtsScore);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as JobRow[];
  } catch (error) {
    console.error('getJobs failed:', error);
    return [];
  }
}

export async function getJobById(id: string): Promise<JobRow | null> {
  try {
    const { data, error } = await db().select('*').eq('id', id).single();
    if (error) throw error;
    return data as JobRow;
  } catch (error) {
    console.error('getJobById failed:', error);
    return null;
  }
}

export async function createJob(
  job: Omit<JobInsert, 'id' | 'scraped_at' | 'updated_at'>,
): Promise<JobRow | null> {
  try {
    const { data, error } = await db()
      .insert(job as JobInsert)
      .select()
      .single();
    if (error) throw error;
    return data as JobRow;
  } catch (error) {
    console.error('createJob failed:', error);
    return null;
  }
}

export async function updateJobStatus(
  id: string,
  status: string,
): Promise<JobRow | null> {
  try {
    const { data, error } = await db()
      .update({ status } as JobInsert)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as JobRow;
  } catch (error) {
    console.error('updateJobStatus failed:', error);
    return null;
  }
}

export async function updateJobAtsScore(
  id: string,
  ats_score: number,
): Promise<JobRow | null> {
  try {
    const { data, error } = await db()
      .update({ ats_score } as JobInsert)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as JobRow;
  } catch (error) {
    console.error('updateJobAtsScore failed:', error);
    return null;
  }
}

export async function upsertJob(
  job: Omit<JobInsert, 'id' | 'scraped_at' | 'updated_at'>,
): Promise<JobRow | null> {
  try {
    const { data, error } = await db()
      .upsert(job as JobInsert, { onConflict: 'url' })
      .select()
      .single();
    if (error) throw error;
    return data as JobRow;
  } catch (error) {
    console.error('upsertJob failed:', error);
    return null;
  }
}

export interface JobStats {
  status: string;
  count: number;
}

export async function getJobStats(): Promise<JobStats[]> {
  try {
    const { data, error } = await db().select('status');
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of data as Pick<JobRow, 'status'>[]) {
      counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    }
    return Array.from(counts, ([status, count]) => ({ status, count }));
  } catch (error) {
    console.error('getJobStats failed:', error);
    return [];
  }
}
