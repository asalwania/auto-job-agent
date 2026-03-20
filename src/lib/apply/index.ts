import { BaseApplier, type ApplyResult } from './base';
import { LinkedInApplier } from './linkedin';
import { DirectPortalApplier } from './direct-portal';
import type { Job } from '@/types';
import { getJobById, updateJobStatus } from '@/lib/db/jobs';
import { getTailoredResumeForJob } from '@/lib/db/resumes';
import { getActiveBaseResume } from '@/lib/db/resumes';
import { createApplication } from '@/lib/db/applications';
import { parseJobDescription, generateCoverLetter } from '@/lib/ai';

// ── Applier factory ───────────────────────────────────────────────

export function getApplier(source: string): BaseApplier {
  switch (source) {
    case 'linkedin':
      return new LinkedInApplier();
    case 'greenhouse':
      return new DirectPortalApplier('greenhouse');
    case 'lever':
      return new DirectPortalApplier('lever');
    case 'wellfound':
      return new DirectPortalApplier('wellfound');
    case 'naukri':
      return new DirectPortalApplier('naukri');
    case 'instahyre':
      return new DirectPortalApplier('instahyre');
    default:
      return new DirectPortalApplier(source);
  }
}

// ── Main entry point ──────────────────────────────────────────────

export async function applyToJob(job: Job): Promise<ApplyResult> {
  // 1. Get tailored resume
  const tailoredResume = await getTailoredResumeForJob(job.id);
  if (!tailoredResume || !tailoredResume.pdf_path) {
    return { success: false, error: `No tailored resume PDF found for job ${job.id}` };
  }

  // 2. Get base resume for cover letter
  const baseResumeRow = await getActiveBaseResume();
  if (!baseResumeRow) {
    return { success: false, error: 'No active base resume found' };
  }

  // 3. Generate cover letter
  const jdAnalysis = await parseJobDescription(job.jdText);
  const coverLetter = await generateCoverLetter(baseResumeRow.data, job, jdAnalysis);

  // 4. Get correct applier and apply
  const applier = getApplier(job.source);
  let result: ApplyResult;

  try {
    await applier.init();
    await updateJobStatus(job.id, 'applying');

    result = await applier.apply(job, tailoredResume.pdf_path, coverLetter);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result = { success: false, error: message };
  } finally {
    await applier.close();
  }

  // 5. Record application
  await createApplication({
    job_id: job.id,
    tailored_resume_id: tailoredResume.id,
    cover_letter: coverLetter,
    applied_at: result.success ? new Date().toISOString() : null,
    response_status: result.success ? 'applied' : 'applied',
    notes: result.success
      ? `Auto-applied via ${job.source}${result.screenshot ? ` — screenshot: ${result.screenshot}` : ''}`
      : `Failed: ${result.error ?? 'Unknown error'}${result.screenshot ? ` — screenshot: ${result.screenshot}` : ''}`,
  });

  // 6. Update job status
  await updateJobStatus(job.id, result.success ? 'applied' : 'failed');

  return result;
}

export { BaseApplier, type ApplyResult } from './base';
