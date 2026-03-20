'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Wand2,
  Send,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { JobDetailModal } from '@/components/jobs/job-detail-modal';
import { useJobs, useJobDetail, type JobRow, type JobFilters } from '@/hooks/use-jobs';

// ── Constants ─────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'applied', label: 'Applied' },
  { value: 'skipped', label: 'Skipped' },
];

const SOURCES = [
  { value: 'all', label: 'All Sources' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'naukri', label: 'Naukri' },
  { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'lever', label: 'Lever' },
  { value: 'wellfound', label: 'Wellfound' },
];

// ── Page ──────────────────────────────────────────────────────────

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>({
    status: 'all',
    source: 'all',
    minScore: 0,
    page: 1,
    limit: 20,
  });
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { jobs, total, page, totalPages, isLoading, mutate } = useJobs(filters);
  const {
    job: selectedJob,
    tailoredResume,
    isLoading: detailLoading,
    mutate: mutateDetail,
  } = useJobDetail(selectedJobId);

  // Filter jobs by search (client-side on current page)
  const filteredJobs = search
    ? jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(search.toLowerCase()) ||
          j.company.toLowerCase().includes(search.toLowerCase()),
      )
    : jobs;

  const updateFilter = useCallback(
    (key: keyof JobFilters, value: string | number) => {
      setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    },
    [],
  );

  // ── Actions ───────────────────────────────────────────────────

  const handleTailor = async (id: string) => {
    await fetch(`/api/jobs/${id}/tailor`, { method: 'POST' });
    mutate();
    mutateDetail();
  };

  const handleApply = async (id: string) => {
    await fetch(`/api/jobs/${id}/apply`, { method: 'POST' });
    mutate();
    mutateDetail();
    setSelectedJobId(null);
  };

  const handleSkip = async (id: string) => {
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'skipped' }),
    });
    mutate();
    mutateDetail();
    setSelectedJobId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Jobs Queue</h1>
          <p className="text-xs text-muted mt-0.5">
            {total} jobs total
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1.5 rounded-md border border-card-border bg-card px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 border-b border-card-border pb-px">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateFilter('status', tab.value)}
            className={`px-3 py-2 text-xs font-medium transition-colors relative ${
              filters.status === tab.value
                ? 'text-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or company..."
            className="w-full rounded-md border border-card-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>

        <select
          value={filters.source ?? 'all'}
          onChange={(e) => updateFilter('source', e.target.value)}
          className="rounded-md border border-card-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${
            showFilters
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-card-border bg-surface text-muted hover:text-foreground'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="flex items-center gap-4 rounded-md border border-card-border bg-surface px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            Min ATS Score
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minScore ?? 0}
              onChange={(e) => updateFilter('minScore', Number(e.target.value))}
              className="w-32 accent-accent"
            />
            <span className="font-mono text-foreground w-8">{filters.minScore ?? 0}</span>
          </label>
        </div>
      )}

      {/* Job List */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-card-border">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-surface" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-surface" />
                  <div className="h-3 w-32 animate-pulse rounded bg-surface" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted">
            No jobs match your filters.
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {filteredJobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onSelect={() => setSelectedJobId(job.id)}
                onTailor={() => handleTailor(job.id)}
                onApply={() => handleApply(job.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Page {page} of {totalPages} ({total} jobs)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
              disabled={page <= 1}
              className="rounded-md border border-card-border p-1.5 hover:bg-surface disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() =>
                setFilters((p) => ({ ...p, page: Math.min(totalPages, (p.page ?? 1) + 1) }))
              }
              disabled={page >= totalPages}
              className="rounded-md border border-card-border p-1.5 hover:bg-surface disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedJobId && selectedJob && (
        <JobDetailModal
          job={selectedJob}
          tailoredResume={tailoredResume}
          isLoading={detailLoading}
          onClose={() => setSelectedJobId(null)}
          onTailor={handleTailor}
          onApply={handleApply}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}

// ── Job Row Component ─────────────────────────────────────────────

function JobRow({
  job,
  onSelect,
  onTailor,
  onApply,
}: {
  job: JobRow;
  onSelect: () => void;
  onTailor: () => void;
  onApply: () => void;
}) {
  const hue = hashCode(job.company) % 360;
  const initials = job.company
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const atsColor =
    job.ats_score == null
      ? 'bg-muted/30'
      : job.ats_score >= 75
        ? 'bg-success'
        : job.ats_score >= 50
          ? 'bg-warning'
          : 'bg-danger';

  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-surface/50 transition-colors group">
      {/* Company initials */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
        style={{ backgroundColor: `hsl(${hue}, 50%, 40%)` }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {job.title}
          </span>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
          <span>{job.company}</span>
          <span>·</span>
          <span>{job.location ?? 'Remote'}</span>
          <span>·</span>
          <span className="uppercase text-[10px] px-1 rounded bg-surface">{job.source}</span>
          {job.role_level !== 'unknown' && (
            <>
              <span>·</span>
              <span className="capitalize">{job.role_level}</span>
            </>
          )}
        </div>
      </div>

      {/* ATS bar */}
      <div className="shrink-0 w-20 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${atsColor}`}
            style={{ width: `${job.ats_score ?? 0}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-muted w-7 text-right">
          {job.ats_score != null ? `${job.ats_score}` : '—'}
        </span>
      </div>

      {/* Status */}
      <div className="shrink-0 w-20">
        <StatusBadge status={job.status} />
      </div>

      {/* Actions */}
      <div className="shrink-0 w-24 flex justify-end">
        {job.status === 'pending' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTailor();
            }}
            className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-[10px] font-medium text-accent hover:bg-accent/20 transition-colors"
          >
            <Wand2 className="h-3 w-3" />
            Tailor
          </button>
        )}
        {job.status === 'approved' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
            className="flex items-center gap-1 rounded-md bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success hover:bg-success/20 transition-colors"
          >
            <Send className="h-3 w-3" />
            Apply
          </button>
        )}
        {(job.status === 'applied' || job.status === 'tailoring') && (
          <button
            onClick={onSelect}
            className="flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-[10px] font-medium text-muted hover:text-foreground transition-colors"
          >
            <Eye className="h-3 w-3" />
            View
          </button>
        )}
      </div>

      {/* Time */}
      <div className="shrink-0 text-[10px] text-muted w-14 text-right">
        {timeAgo(job.scraped_at)}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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
