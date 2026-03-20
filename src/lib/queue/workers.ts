import { Worker, type Job } from 'bullmq';
import { redisConnection } from './redis';
import { SCRAPER_QUEUE, TAILOR_QUEUE, APPLY_QUEUE, tailorQueue } from './queues';
import { runScrapers } from '@/lib/scrapers';
import { getJobById, updateJobStatus, updateJobAtsScore, getJobs } from '@/lib/db/jobs';
import { getActiveBaseResume, createTailoredResume, getTailoredResumeForJob } from '@/lib/db/resumes';
import { createApplication } from '@/lib/db/applications';
import { parseJobDescription, tailorResume, generateCoverLetter } from '@/lib/ai';
import { generateResumePdf } from '@/lib/resume/pdf-builder';
import { getResumePath } from '@/lib/resume/storage';
import { sendNotificationEmail } from './notify';

// ── Scraper Worker ────────────────────────────────────────────────

function createScraperWorker() {
  return new Worker(
    SCRAPER_QUEUE,
    async (job: Job<{ query: string; location?: string }>) => {
      const { query, location } = job.data;
      console.log(`[scraper-worker] starting scrape: query="${query}" location="${location}"`);

      const result = await runScrapers(query, location);

      // Queue tailoring for all pending jobs (not just from this run)
      const pendingJobs = await getJobs({ status: 'pending' });
      for (const pending of pendingJobs) {
        await tailorQueue.add('tailor', { jobId: pending.id }, { priority: 5 });
      }

      return result;
    },
    { connection: redisConnection, concurrency: 1 },
  );
}

// ── Tailor Worker ─────────────────────────────────────────────────

function createTailorWorker() {
  return new Worker(
    TAILOR_QUEUE,
    async (job: Job<{ jobId: string }>) => {
      const { jobId } = job.data;
      console.log(`[tailor-worker] processing job ${jobId}`);

      // 1. Fetch job from DB
      const dbJob = await getJobById(jobId);
      if (!dbJob) throw new Error(`Job ${jobId} not found`);
      if (!dbJob.jd_text) {
        console.warn(`[tailor-worker] job ${jobId} has no JD text — skipping`);
        await updateJobStatus(jobId, 'skipped');
        return;
      }

      // 2. Get active base resume
      const baseResumeRow = await getActiveBaseResume();
      if (!baseResumeRow) throw new Error('No active base resume found');
      const baseResume = baseResumeRow.data;

      // 3. Update status to tailoring
      await updateJobStatus(jobId, 'tailoring');

      // 4. Parse JD
      const jdAnalysis = await parseJobDescription(dbJob.jd_text);

      // 5. Tailor resume
      const tailored = await tailorResume(baseResume, jdAnalysis, dbJob.jd_text);
      tailored.jobId = jobId;

      // 6. Generate PDF
      const pdfPath = await getResumePath(jobId);
      await generateResumePdf(baseResume, tailored, pdfPath);

      // 7. Save tailored resume to DB
      await createTailoredResume({
        job_id: jobId,
        base_resume_id: baseResumeRow.id,
        tailored_bullets: tailored.tailoredBullets,
        tailored_summary: tailored.tailoredSummary,
        ats_score: tailored.atsScore,
        missing_keywords: tailored.missingKeywords,
        covered_keywords: tailored.coveredKeywords,
        pdf_path: pdfPath,
      });

      // 8. Update job ATS score
      await updateJobAtsScore(jobId, tailored.atsScore);

      // 9. Approve or skip based on score
      const ATS_THRESHOLD = 75;
      if (tailored.atsScore >= ATS_THRESHOLD) {
        await updateJobStatus(jobId, 'approved');

        // Send notification email
        await sendNotificationEmail({
          jobTitle: dbJob.title,
          company: dbJob.company,
          atsScore: tailored.atsScore,
          coveredKeywords: tailored.coveredKeywords,
          missingKeywords: tailored.missingKeywords,
          jobUrl: dbJob.url,
        });
      } else {
        await updateJobStatus(jobId, 'skipped');
      }

      console.log(
        `[tailor-worker] job ${jobId}: score=${tailored.atsScore}, status=${tailored.atsScore >= ATS_THRESHOLD ? 'approved' : 'skipped'}`,
      );
    },
    { connection: redisConnection, concurrency: 2 },
  );
}

// ── Apply Worker (scaffold) ───────────────────────────────────────

function createApplyWorker() {
  return new Worker(
    APPLY_QUEUE,
    async (job: Job<{ jobId: string }>) => {
      const { jobId } = job.data;
      console.log(`[apply-worker] processing job ${jobId}`);

      // 1. Get job + tailored resume from DB
      const dbJob = await getJobById(jobId);
      if (!dbJob) throw new Error(`Job ${jobId} not found`);

      const tailoredResume = await getTailoredResumeForJob(jobId);
      if (!tailoredResume) throw new Error(`No tailored resume for job ${jobId}`);

      // 2. Get base resume for cover letter
      const baseResumeRow = await getActiveBaseResume();
      if (!baseResumeRow) throw new Error('No active base resume found');

      // 3. Generate cover letter
      const jdAnalysis = await parseJobDescription(dbJob.jd_text ?? '');
      const coverLetter = await generateCoverLetter(
        baseResumeRow.data,
        {
          id: dbJob.id,
          title: dbJob.title,
          company: dbJob.company,
          location: dbJob.location ?? '',
          url: dbJob.url,
          source: dbJob.source as 'linkedin',
          jdText: dbJob.jd_text ?? '',
          jdHash: dbJob.jd_hash ?? '',
          requiredSkills: dbJob.required_skills,
          niceToHaveSkills: dbJob.nice_to_have_skills,
          experienceYears: dbJob.experience_years,
          roleLevel: (dbJob.role_level as 'unknown') ?? 'unknown',
          atsScore: dbJob.ats_score,
          status: dbJob.status as 'approved',
          scrapedAt: dbJob.scraped_at,
          updatedAt: dbJob.updated_at,
        },
        jdAnalysis,
      );

      // 4. Update job status
      await updateJobStatus(jobId, 'applying');

      // 5. Apply via appropriate strategy based on source
      // TODO: implement per-source apply strategies
      //   - linkedin: use Playwright to Easy Apply
      //   - greenhouse/lever: submit via their apply forms
      //   - naukri: use Playwright to apply
      //   - wellfound: use Playwright to apply
      console.warn(`[apply-worker] auto-apply for source="${dbJob.source}" not yet implemented`);

      // 6. Record application
      await createApplication({
        job_id: jobId,
        tailored_resume_id: tailoredResume.id,
        cover_letter: coverLetter,
        applied_at: null, // will be set when actually applied
        response_status: 'applied',
        notes: `Auto-apply pending for ${dbJob.source}`,
      });

      // TODO: update status to 'applied' after actual submission
      // await updateJobStatus(jobId, 'applied');
    },
    { connection: redisConnection, concurrency: 1 },
  );
}

// ── Export ─────────────────────────────────────────────────────────

export function startAllWorkers() {
  const scraper = createScraperWorker();
  const tailor = createTailorWorker();
  const apply = createApplyWorker();

  console.log('[workers] all workers started');

  return { scraper, tailor, apply };
}
