import { NextResponse } from 'next/server';
import { getJobStats, getJobs } from '@/lib/db/jobs';
import { getApplicationStats, getApplications } from '@/lib/db/applications';

export async function GET() {
  try {
    const [jobStats, applicationStats, allJobs, allApplications] = await Promise.all([
      getJobStats(),
      getApplicationStats(),
      getJobs(),
      getApplications(),
    ]);

    // Average ATS score (from jobs that have one)
    const jobsWithScore = allJobs.filter((j) => j.ats_score != null);
    const avgAtsScore = jobsWithScore.length
      ? Math.round(
          jobsWithScore.reduce((sum, j) => sum + (j.ats_score ?? 0), 0) /
            jobsWithScore.length,
        )
      : 0;

    // Applied counts: today and this week
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay(),
    ).toISOString();

    const appliedToday = allApplications.filter(
      (a) => a.applied_at && a.applied_at >= startOfDay,
    ).length;

    const appliedThisWeek = allApplications.filter(
      (a) => a.applied_at && a.applied_at >= startOfWeek,
    ).length;

    return NextResponse.json({
      jobStats,
      applicationStats,
      avgAtsScore,
      totalAppliedToday: appliedToday,
      totalAppliedThisWeek: appliedThisWeek,
    });
  } catch (error) {
    console.error('GET /api/stats failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
