'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ExternalLink,
  FileText,
  Mail,
  ChevronDown,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';

// ── Types ─────────────────────────────────────────────────────────

interface ApplicationRow {
  id: string;
  job_id: string;
  tailored_resume_id: string | null;
  cover_letter: string | null;
  applied_at: string | null;
  response_status: string;
  notes: string | null;
  created_at: string;
}

interface JobRow {
  id: string;
  title: string;
  company: string;
  source: string;
  url: string;
  ats_score: number | null;
}

interface EnrichedApplication extends ApplicationRow {
  job?: JobRow;
}

interface Stats {
  applicationStats: { response_status: string; count: number }[];
}

const RESPONSE_STATUSES = ['applied', 'viewed', 'rejected', 'interview', 'offer'];

// ── Page ──────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      const [appsRes, statsRes] = await Promise.all([
        fetch('/api/jobs?status=applied&limit=100'),
        fetch('/api/stats'),
      ]);
      const appsData = await appsRes.json();
      const statsData = await statsRes.json();

      // Enrich with application data — in a real app we'd have a dedicated endpoint
      const jobs: JobRow[] = appsData.jobs ?? [];
      const enriched: EnrichedApplication[] = jobs.map((j: JobRow) => ({
        id: j.id,
        job_id: j.id,
        tailored_resume_id: null,
        cover_letter: null,
        applied_at: null,
        response_status: 'applied',
        notes: null,
        created_at: '',
        job: j,
      }));

      setApplications(enriched);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (jobId: string, status: string) => {
    await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setApplications((prev) =>
      prev.map((a) =>
        a.job_id === jobId ? { ...a, response_status: status } : a,
      ),
    );
  };

  const filtered =
    filterStatus === 'all'
      ? applications
      : applications.filter((a) => a.response_status === filterStatus);

  const getCount = (status: string) =>
    stats?.applicationStats.find((s) => s.response_status === status)?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Applications</h1>
        <p className="text-xs text-muted mt-0.5">Track submitted applications and responses</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-5 gap-3">
        {RESPONSE_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
            className={`rounded-lg border p-4 text-center transition-colors ${
              filterStatus === status
                ? 'border-accent bg-accent/10'
                : 'border-card-border bg-card hover:bg-surface'
            }`}
          >
            <div className="font-mono text-2xl font-bold text-foreground">
              {getCount(status)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted mt-1 capitalize">
              {status}
            </div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_80px_70px_120px_100px] items-center gap-4 border-b border-card-border bg-surface px-5 py-2.5 text-[10px] uppercase tracking-wider text-muted font-medium">
          <span>Company &amp; Role</span>
          <span>Applied</span>
          <span>Source</span>
          <span className="text-right">ATS</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="divide-y divide-card-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-4 w-64 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="h-10 w-10 text-muted/40 mb-3" />
            <p className="text-sm text-muted">No applications yet</p>
            <p className="text-xs text-muted/60 mt-1">
              Go to Jobs to start applying
            </p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {filtered.map((app) => (
              <div key={app.id}>
                {/* Row */}
                <div
                  className="grid grid-cols-[1fr_100px_80px_70px_120px_100px] items-center gap-4 px-5 py-3 hover:bg-surface/50 transition-colors cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === app.id ? null : app.id)
                  }
                >
                  {/* Company + Role */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button className="shrink-0 text-muted">
                      {expandedId === app.id ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {app.job?.title ?? 'Unknown Role'}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {app.job?.company ?? 'Unknown Company'}
                      </p>
                    </div>
                  </div>

                  {/* Applied date */}
                  <span className="text-xs text-muted">
                    {app.applied_at ? timeAgo(app.applied_at) : timeAgo(app.created_at)}
                  </span>

                  {/* Source */}
                  <span className="text-[10px] uppercase text-muted px-1.5 py-0.5 rounded bg-surface inline-block w-fit">
                    {app.job?.source ?? '—'}
                  </span>

                  {/* ATS */}
                  <span className="font-mono text-xs text-muted text-right">
                    {app.job?.ats_score != null ? `${app.job.ats_score}%` : '—'}
                  </span>

                  {/* Status dropdown */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      value={app.response_status}
                      onChange={(e) =>
                        updateStatus(app.job_id, e.target.value)
                      }
                      className="rounded-md border border-card-border bg-surface px-2 py-1 text-[10px] text-foreground focus:border-accent focus:outline-none"
                    >
                      {RESPONSE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(app.id);
                      }}
                      className="p-1 text-muted hover:text-accent transition-colors"
                      title="View details"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    {app.job?.url && (
                      <a
                        href={app.job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-muted hover:text-accent transition-colors"
                        title="Open job URL"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === app.id && (
                  <div className="border-t border-card-border bg-surface/30 px-5 py-4 space-y-4">
                    {app.cover_letter && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Mail className="h-3.5 w-3.5 text-muted" />
                          <span className="text-[10px] uppercase tracking-wider text-muted font-medium">
                            Cover Letter
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {app.cover_letter}
                        </p>
                      </div>
                    )}

                    {app.tailored_resume_id && (
                      <div className="text-xs text-muted">
                        Resume ID: <span className="font-mono text-foreground">{app.tailored_resume_id}</span>
                      </div>
                    )}

                    {app.notes && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted font-medium">
                          Notes
                        </span>
                        <p className="text-sm text-foreground/70 mt-1">
                          {app.notes}
                        </p>
                      </div>
                    )}

                    {!app.cover_letter && !app.notes && (
                      <p className="text-xs text-muted/60">No additional details available.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  if (!dateStr) return '—';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
