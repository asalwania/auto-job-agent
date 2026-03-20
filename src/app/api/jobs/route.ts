import { NextRequest, NextResponse } from 'next/server';
import { getJobs } from '@/lib/db/jobs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? undefined;
    const source = searchParams.get('source') ?? undefined;
    const minAtsScore = searchParams.get('minScore')
      ? Number(searchParams.get('minScore'))
      : undefined;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));

    const allJobs = await getJobs({ status, source, minAtsScore });

    const total = allJobs.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const jobs = allJobs.slice(start, start + limit);

    return NextResponse.json({ jobs, total, page, totalPages });
  } catch (error) {
    console.error('GET /api/jobs failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
