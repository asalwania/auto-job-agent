'use client';

import { useEffect, useState, useCallback } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Database,
  Clock,
  Send,
  Target,
  Play,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────

interface Stats {
  jobStats: { status: string; count: number }[];
  applicationStats: { response_status: string; count: number }[];
  avgAtsScore: number;
  totalAppliedToday: number;
  totalAppliedThisWeek: number;
}

interface JobRow {
  id: string;
  title: string;
  company: string;
  source: string;
  status: string;
  ats_score: number | null;
  scraped_at: string;
  url: string;
}

// ── Page ──────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, jobsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/jobs?limit=10'),
      ]);
      const statsData = await statsRes.json();
      const jobsData = await jobsRes.json();
      setStats(statsData);
      setRecentJobs(jobsData.jobs ?? []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerScrape = async () => {
    setScraping(true);
    try {
      await fetch('/api/cron/scrape', {
        method: 'POST',
        headers: { 'X-Cron-Secret': 'manual-trigger' },
      });
    } catch (err) {
      console.error('Scrape trigger failed:', err);
    } finally {
      setTimeout(() => setScraping(false), 2000);
    }
  };

  // Derived stats
  const totalScraped = stats?.jobStats.reduce((s, j) => s + j.count, 0) ?? 0;
  const pendingCount =
    stats?.jobStats.find((s) => s.status === 'pending')?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Overview</h1>
          <p className="text-xs text-muted mt-0.5">Pipeline status and recent activity</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-md border border-card-border bg-card px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-card border border-card-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Scraped" value={totalScraped} icon={Database} />
          <StatCard label="Pending Review" value={pendingCount} icon={Clock} />
          <StatCard
            label="Applied This Week"
            value={stats?.totalAppliedThisWeek ?? 0}
            icon={Send}
          />
          <StatCard
            label="Avg ATS Score"
            value={stats?.avgAtsScore ?? 0}
            icon={Target}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Jobs Table */}
        <div className="col-span-2 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">Recent Jobs</h2>
            <span className="text-[10px] uppercase tracking-wider text-muted">
              Last 10
            </span>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-surface" />
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted">
              No jobs scraped yet. Run the scraper to get started.
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-surface/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-foreground">
                        {job.title}
                      </span>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted hover:text-accent"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                      <span>{job.company}</span>
                      <span>·</span>
                      <span className="uppercase text-[10px]">{job.source}</span>
                    </div>
                  </div>

                  <div className="shrink-0 font-mono text-xs text-muted w-12 text-right">
                    {job.ats_score != null ? `${job.ats_score}%` : '—'}
                  </div>

                  <div className="shrink-0 w-20">
                    <StatusBadge status={job.status} />
                  </div>

                  <div className="shrink-0 text-[10px] text-muted w-16 text-right">
                    {timeAgo(job.scraped_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="rounded-lg border border-card-border bg-card p-4 space-y-4">
            <h2 className="text-sm font-medium text-foreground">Quick Actions</h2>

            <button
              onClick={triggerScrape}
              disabled={scraping}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {scraping ? 'Scraping...' : 'Run Scraper Now'}
            </button>

            <p className="text-[10px] text-muted leading-relaxed">
              Triggers all scrapers (LinkedIn, Naukri, Greenhouse, Lever, Wellfound).
              New jobs will be automatically queued for AI tailoring.
            </p>
          </div>

          {/* Pipeline breakdown */}
          <div className="rounded-lg border border-card-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Pipeline</h2>
            {stats?.jobStats.length ? (
              stats.jobStats
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-xs">
                    <StatusBadge status={s.status} />
                    <span className="font-mono text-foreground">{s.count}</span>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted">No data yet</p>
            )}
          </div>

          {/* Application stats */}
          <div className="rounded-lg border border-card-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Applications</h2>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Today</span>
              <span className="font-mono text-foreground">{stats?.totalAppliedToday ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">This week</span>
              <span className="font-mono text-foreground">{stats?.totalAppliedThisWeek ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
