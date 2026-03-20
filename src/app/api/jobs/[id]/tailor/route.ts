import { NextRequest, NextResponse } from 'next/server';
import { getJobById } from '@/lib/db/jobs';
import { tailorQueue } from '@/lib/queue/queues';

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

    await tailorQueue.add('manual-tailor', { jobId: id }, { priority: 1 });

    return NextResponse.json({ queued: true });
  } catch (error) {
    console.error('POST /api/jobs/[id]/tailor failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
