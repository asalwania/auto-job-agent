import { createServiceClient } from './client';
import type { ApplicationRow, ApplicationInsert } from '@/types/database';

// ── Filters ───────────────────────────────────────────────────────

export interface ApplicationFilters {
  responseStatus?: string;
  jobId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────

function db() {
  return createServiceClient().from('applications');
}

// ── Queries ───────────────────────────────────────────────────────

export async function createApplication(
  data: Omit<ApplicationInsert, 'id' | 'created_at'>,
): Promise<ApplicationRow | null> {
  try {
    const { data: row, error } = await db()
      .insert(data as ApplicationInsert)
      .select()
      .single();
    if (error) throw error;
    return row as ApplicationRow;
  } catch (error) {
    console.error('createApplication failed:', error);
    return null;
  }
}

export async function updateApplicationStatus(
  id: string,
  response_status: string,
): Promise<ApplicationRow | null> {
  try {
    const { data, error } = await db()
      .update({ response_status } as ApplicationInsert)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ApplicationRow;
  } catch (error) {
    console.error('updateApplicationStatus failed:', error);
    return null;
  }
}

export async function getApplications(
  filters?: ApplicationFilters,
): Promise<ApplicationRow[]> {
  try {
    let query = db().select('*').order('created_at', { ascending: false });

    if (filters?.responseStatus) {
      query = query.eq('response_status', filters.responseStatus);
    }
    if (filters?.jobId) {
      query = query.eq('job_id', filters.jobId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ApplicationRow[];
  } catch (error) {
    console.error('getApplications failed:', error);
    return [];
  }
}

export interface ApplicationStats {
  response_status: string;
  count: number;
}

export async function getApplicationStats(): Promise<ApplicationStats[]> {
  try {
    const { data, error } = await db().select('response_status');
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of data as Pick<ApplicationRow, 'response_status'>[]) {
      counts.set(
        row.response_status,
        (counts.get(row.response_status) ?? 0) + 1,
      );
    }
    return Array.from(counts, ([response_status, count]) => ({
      response_status,
      count,
    }));
  } catch (error) {
    console.error('getApplicationStats failed:', error);
    return [];
  }
}
