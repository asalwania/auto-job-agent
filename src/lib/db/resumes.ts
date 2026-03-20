import { createServiceClient } from './client';
import type { BaseResume } from '@/types';
import type {
  BaseResumeRow,
  BaseResumeInsert,
  TailoredResumeRow,
  TailoredResumeInsert,
} from '@/types/database';

// ── Helpers ───────────────────────────────────────────────────────

function supabase() {
  return createServiceClient();
}

// ── Base Resume ───────────────────────────────────────────────────

export async function getActiveBaseResume(): Promise<BaseResumeRow | null> {
  try {
    const { data, error } = await supabase()
      .from('base_resumes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    return data as BaseResumeRow;
  } catch (error) {
    console.error('getActiveBaseResume failed:', error);
    return null;
  }
}

export async function upsertBaseResume(
  data: BaseResume,
  name: string,
): Promise<BaseResumeRow | null> {
  try {
    const client = supabase();

    // Deactivate all existing resumes
    await client
      .from('base_resumes')
      .update({ is_active: false } as BaseResumeInsert)
      .eq('is_active', true);

    // Insert new active resume
    const { data: row, error } = await client
      .from('base_resumes')
      .insert({ name, data, is_active: true } as BaseResumeInsert)
      .select()
      .single();
    if (error) throw error;
    return row as BaseResumeRow;
  } catch (error) {
    console.error('upsertBaseResume failed:', error);
    return null;
  }
}

// ── Tailored Resumes ──────────────────────────────────────────────

export async function createTailoredResume(
  data: Omit<TailoredResumeInsert, 'id' | 'created_at'>,
): Promise<TailoredResumeRow | null> {
  try {
    const { data: row, error } = await supabase()
      .from('tailored_resumes')
      .insert(data as TailoredResumeInsert)
      .select()
      .single();
    if (error) throw error;
    return row as TailoredResumeRow;
  } catch (error) {
    console.error('createTailoredResume failed:', error);
    return null;
  }
}

export async function getTailoredResumeForJob(
  jobId: string,
): Promise<TailoredResumeRow | null> {
  try {
    const { data, error } = await supabase()
      .from('tailored_resumes')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    return data as TailoredResumeRow;
  } catch (error) {
    console.error('getTailoredResumeForJob failed:', error);
    return null;
  }
}
