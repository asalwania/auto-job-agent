'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────

interface JobRow {
  id: string;
  title: string;
  company: string;
  ats_score: number | null;
  status: string;
  required_skills: string[];
  scraped_at: string;
}

interface Stats {
  jobStats: { status: string; count: number }[];
  applicationStats: { response_status: string; count: number }[];
  avgAtsScore: number;
  totalAppliedThisWeek: number;
}

// ── Colors ────────────────────────────────────────────────────────

const ACCENT = '#3b82f6';
const SUCCESS = '#22c55e';
const WARNING = '#eab308';
const DANGER = '#ef4444';
const MUTED = '#64748b';
const TEAL = '#14b8a6';
const PURPLE = '#a855f7';
const CARD_BORDER = '#2a2d3a';

const PIE_COLORS: Record<string, string> = {
  applied: TEAL,
  viewed: ACCENT,
  interview: SUCCESS,
  rejected: DANGER,
  offer: WARNING,
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1a1d27',
    border: `1px solid ${CARD_BORDER}`,
    borderRadius: 8,
    fontSize: 12,
    color: '#e2e8f0',
  },
  itemStyle: { color: '#e2e8f0' },
};

// ── Page ──────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch('/api/jobs?limit=100'),
        fetch('/api/stats'),
      ]);
      const jobsData = await jobsRes.json();
      const statsData = await statsRes.json();
      setJobs(jobsData.jobs ?? []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived data ──────────────────────────────────────────────

  // Applications per day (last 30 days)
  const appliedJobs = jobs.filter((j) => j.status === 'applied');
  const dailyApps = buildDailyData(appliedJobs, 30);

  // ATS score distribution
  const atsDistribution = buildAtsDistribution(jobs);

  // Response status pie data
  const pieData = (stats?.applicationStats ?? []).map((s) => ({
    name: s.response_status.charAt(0).toUpperCase() + s.response_status.slice(1),
    value: s.count,
    key: s.response_status,
  }));

  // Top companies
  const topCompanies = buildTopCompanies(appliedJobs, 8);

  // Top skills
  const topSkills = buildTopSkills(jobs, 12);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-card border border-card-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
          <p className="text-xs text-muted mt-0.5">Pipeline performance and trends</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <TrendingUp className="h-3.5 w-3.5" />
          {stats?.totalAppliedThisWeek ?? 0} applied this week
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Applications per day */}
        <ChartCard title="Applications per Day" subtitle="Last 30 days">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyApps}>
              <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} />
              <XAxis
                dataKey="label"
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: CARD_BORDER }}
              />
              <YAxis
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={ACCENT}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: ACCENT }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ATS Score Distribution */}
        <ChartCard title="ATS Score Distribution" subtitle="All scored jobs">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={atsDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} />
              <XAxis
                dataKey="range"
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: CARD_BORDER }}
              />
              <YAxis
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {atsDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Response Status Pie */}
        <ChartCard title="Response Breakdown" subtitle="Application outcomes">
          {pieData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={PIE_COLORS[entry.key] ?? MUTED}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((entry) => (
                  <div key={entry.key} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[entry.key] ?? MUTED }}
                    />
                    <span className="text-muted w-16">{entry.name}</span>
                    <span className="font-mono text-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message="No application data yet" />
          )}
        </ChartCard>

        {/* Top Skills */}
        <ChartCard title="Top Skills in JDs" subtitle="Most requested keywords">
          {topSkills.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topSkills} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="skill"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={PURPLE} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No skill data yet" />
          )}
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Companies */}
        <div className="rounded-lg border border-card-border bg-card p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted mb-4">
            Top Companies Applied To
          </h3>
          {topCompanies.length > 0 ? (
            <div className="space-y-2.5">
              {topCompanies.map((c, i) => (
                <div key={c.company} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted w-4 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate">
                        {c.company}
                      </span>
                      <span className="font-mono text-xs text-muted">{c.count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-surface mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${(c.count / topCompanies[0].count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted/60 text-center py-8">No data yet</p>
          )}
        </div>

        {/* Summary stats */}
        <div className="rounded-lg border border-card-border bg-card p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted mb-4">
            Summary
          </h3>
          <div className="space-y-4">
            <SummaryRow label="Total Jobs Scraped" value={jobs.length} />
            <SummaryRow label="Total Applied" value={appliedJobs.length} />
            <SummaryRow label="Avg ATS Score" value={`${stats?.avgAtsScore ?? 0}%`} />
            <SummaryRow
              label="Applied This Week"
              value={stats?.totalAppliedThisWeek ?? 0}
            />
            <SummaryRow
              label="Interview Rate"
              value={
                appliedJobs.length > 0
                  ? `${Math.round(
                      ((stats?.applicationStats.find((s) => s.response_status === 'interview')
                        ?.count ?? 0) /
                        appliedJobs.length) *
                        100,
                    )}%`
                  : '—'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-card-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-xs text-muted/60">
      {message}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

// ── Data builders ─────────────────────────────────────────────────

function buildDailyData(jobs: JobRow[], days: number) {
  const now = new Date();
  const map = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  for (const job of jobs) {
    const key = job.scraped_at.slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }

  return Array.from(map, ([date, count]) => ({
    date,
    label: `${new Date(date).getMonth() + 1}/${new Date(date).getDate()}`,
    count,
  }));
}

function buildAtsDistribution(jobs: JobRow[]) {
  const buckets = [
    { range: '<50', min: 0, max: 49, color: DANGER, count: 0 },
    { range: '50-64', min: 50, max: 64, color: WARNING, count: 0 },
    { range: '65-74', min: 65, max: 74, color: WARNING, count: 0 },
    { range: '75-84', min: 75, max: 84, color: SUCCESS, count: 0 },
    { range: '85-100', min: 85, max: 100, color: ACCENT, count: 0 },
  ];

  for (const job of jobs) {
    if (job.ats_score == null) continue;
    const bucket = buckets.find(
      (b) => job.ats_score! >= b.min && job.ats_score! <= b.max,
    );
    if (bucket) bucket.count++;
  }

  return buckets;
}

function buildTopCompanies(jobs: JobRow[], limit: number) {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    counts.set(job.company, (counts.get(job.company) ?? 0) + 1);
  }
  return Array.from(counts, ([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildTopSkills(jobs: JobRow[], limit: number) {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    for (const skill of job.required_skills) {
      const normalized = skill.toLowerCase().trim();
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts, ([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
