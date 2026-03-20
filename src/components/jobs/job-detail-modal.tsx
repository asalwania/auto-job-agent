'use client';

import { useState } from 'react';
import { X, ExternalLink, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import type { JobRow, TailoredResumeRow } from '@/hooks/use-jobs';

interface JobDetailModalProps {
  job: JobRow;
  tailoredResume: TailoredResumeRow | null;
  isLoading: boolean;
  onClose: () => void;
  onTailor: (id: string) => void;
  onApply: (id: string) => void;
  onSkip: (id: string) => void;
}

export function JobDetailModal({
  job,
  tailoredResume,
  isLoading,
  onClose,
  onTailor,
  onApply,
  onSkip,
}: JobDetailModalProps) {
  const [coverLetterDraft, setCoverLetterDraft] = useState('');

  const covered = tailoredResume?.covered_keywords ?? [];
  const missing = tailoredResume?.missing_keywords ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-8 pb-8 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-lg border border-card-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <CompanyInitials company={job.company} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground truncate">
                  {job.title}
                </h2>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted hover:text-accent"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                <span>{job.company}</span>
                <span>·</span>
                <span>{job.location ?? 'Remote'}</span>
                <span>·</span>
                <span className="uppercase text-[10px]">{job.source}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={job.status} />
            {job.ats_score != null && (
              <span className="font-mono text-sm font-bold text-foreground">
                {job.ats_score}%
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted hover:text-foreground hover:bg-surface transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-surface" />
            ))}
          </div>
        ) : (
          <>
            {/* Content: JD + Tailored Resume */}
            <div className="grid grid-cols-2 divide-x divide-card-border">
              {/* Left: JD */}
              <div className="p-5 max-h-[50vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted" />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
                    Job Description
                  </h3>
                </div>
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {job.jd_text || 'No job description available.'}
                </div>
              </div>

              {/* Right: Tailored Resume */}
              <div className="p-5 max-h-[50vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
                    Tailored Resume Preview
                  </h3>
                </div>

                {tailoredResume ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    {tailoredResume.tailored_summary && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted mb-1">
                          Summary
                        </p>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {highlightKeywords(
                            tailoredResume.tailored_summary,
                            covered,
                          )}
                        </p>
                      </div>
                    )}

                    {/* Bullets */}
                    {tailoredResume.tailored_bullets &&
                      Object.entries(tailoredResume.tailored_bullets).map(
                        ([company, bullets]) => (
                          <div key={company}>
                            <p className="text-xs font-medium text-foreground mb-1">
                              {company}
                            </p>
                            <ul className="space-y-1">
                              {bullets.map((bullet, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-foreground/80 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-muted"
                                >
                                  {highlightKeywords(bullet, covered)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ),
                      )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="h-8 w-8 text-muted mb-2" />
                    <p className="text-sm text-muted">
                      No tailored resume yet.
                    </p>
                    <button
                      onClick={() => onTailor(job.id)}
                      className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                    >
                      Tailor Resume
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ATS Keywords */}
            {tailoredResume && (covered.length > 0 || missing.length > 0) && (
              <div className="border-t border-card-border px-5 py-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted mb-3">
                  ATS Keyword Coverage
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {covered.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success border border-success/20"
                    >
                      {kw}
                    </span>
                  ))}
                  {missing.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-medium text-danger border border-danger/20"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cover Letter */}
            {job.status === 'approved' && (
              <div className="border-t border-card-border px-5 py-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted mb-2">
                  Cover Letter
                </h3>
                <textarea
                  value={coverLetterDraft}
                  onChange={(e) => setCoverLetterDraft(e.target.value)}
                  placeholder="Cover letter will be auto-generated when applying, or type your own here..."
                  rows={4}
                  className="w-full rounded-md border border-card-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none resize-none"
                />
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-end gap-3 border-t border-card-border px-6 py-4">
              {job.status === 'pending' && (
                <button
                  onClick={() => onTailor(job.id)}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
                >
                  Tailor Resume
                </button>
              )}

              {job.status === 'approved' && (
                <>
                  <button
                    onClick={() => onSkip(job.id)}
                    className="rounded-md border border-card-border bg-surface px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => onApply(job.id)}
                    className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 transition-colors"
                  >
                    Apply Now
                  </button>
                </>
              )}

              {(job.status === 'applied' || job.status === 'failed' || job.status === 'skipped') && (
                <button
                  onClick={onClose}
                  className="rounded-md border border-card-border bg-surface px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function CompanyInitials({ company }: { company: string }) {
  const initials = company
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const hue = hashCode(company) % 360;

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ backgroundColor: `hsl(${hue}, 50%, 40%)` }}
    >
      {initials}
    </div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function highlightKeywords(
  text: string,
  keywords: string[],
): React.ReactNode {
  if (!keywords.length) return text;

  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isKeyword = keywords.some(
      (k) => k.toLowerCase() === part.toLowerCase(),
    );
    return isKeyword ? (
      <span key={i} className="text-accent font-medium">
        {part}
      </span>
    ) : (
      part
    );
  });
}
