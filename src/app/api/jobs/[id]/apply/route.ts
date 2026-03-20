import { NextRequest, NextResponse } from 'next/server';
import { getJobById } from '@/lib/db/jobs';
import { applyQueue } from '@/lib/queue/queues';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'approved') {
      return NextResponse.json(
        { error: `Job must be in 'approved' status to apply. Current: '${job.status}'` },
        { status: 400 },
      );
    }

    await applyQueue.add('manual-apply', { jobId: id }, { priority: 1 });

    return NextResponse.json({ queued: true });
  } catch (error) {
    console.error('POST /api/jobs/[id]/apply failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
