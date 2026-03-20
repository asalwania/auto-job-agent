import { NextRequest, NextResponse } from 'next/server';
import { getActiveBaseResume, upsertBaseResume } from '@/lib/db/resumes';
import type { BaseResume } from '@/types';

export async function GET() {
  try {
    const resume = await getActiveBaseResume();
    if (!resume) {
      return NextResponse.json({ error: 'No active base resume found' }, { status: 404 });
    }

    return NextResponse.json({ resume });
  } catch (error) {
    console.error('GET /api/resume/base failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, name } = body as { data?: BaseResume; name?: string };

    if (!data) {
      return NextResponse.json({ error: 'data (BaseResume) is required' }, { status: 400 });
    }

    const resume = await upsertBaseResume(data, name ?? 'base-v1');
    if (!resume) {
      return NextResponse.json({ error: 'Failed to upsert resume' }, { status: 500 });
    }

    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    console.error('POST /api/resume/base failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
