import { NextRequest, NextResponse } from 'next/server';
import { scraperQueue } from '@/lib/queue/queues';

export async function POST(request: NextRequest) {
  try {
    // const secret = request.headers.get('X-Cron-Secret');
    // if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await scraperQueue.add('cron-scrape', {
      query: 'Full Stack Developer',
      location: 'India',
    });

    return NextResponse.json({ queued: true });
  } catch (error) {
    console.error('POST /api/cron/scrape failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
