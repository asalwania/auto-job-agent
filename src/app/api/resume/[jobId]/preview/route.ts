import { NextRequest, NextResponse } from 'next/server';
import { getJobById } from '@/lib/db/jobs';
import { getTailoredResumeForJob } from '@/lib/db/resumes';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    const job = await getJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const tailoredResume = await getTailoredResumeForJob(jobId);
    if (!tailoredResume) {
      return NextResponse.json(
        { error: 'No tailored resume found for this job' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        ats_score: job.ats_score,
      },
      tailoredResume,
    });
  } catch (error) {
    console.error('GET /api/resume/[jobId]/preview failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
