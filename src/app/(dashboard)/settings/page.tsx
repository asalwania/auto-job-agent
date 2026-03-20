'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Save,
  FileDown,
  Play,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  Bell,
  Cog,
  User,
  Search,
  X,
} from 'lucide-react';
import { TagInput } from '@/components/ui/tag-input';
import { useSettings } from '@/hooks/use-settings';

// ── Types ─────────────────────────────────────────────────────────

interface BaseResume {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  projects: Project[];
}

interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationYear: number;
}

interface Project {
  name: string;
  description: string;
  techStack: string[];
  url: string;
}

const SOURCES_LIST = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'naukri', label: 'Naukri' },
  { key: 'greenhouse', label: 'Greenhouse' },
  { key: 'lever', label: 'Lever' },
  { key: 'wellfound', label: 'Wellfound' },
];

// ── Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, update, loaded } = useSettings();
  const [resume, setResume] = useState<BaseResume | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    fetch('/api/resume/base')
      .then((r) => r.json())
      .then((data) => setResume(data.resume?.data ?? null))
      .catch(console.error)
      .finally(() => setResumeLoading(false));
  }, []);

  const saveResume = useCallback(async () => {
    if (!resume) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/resume/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: resume, name: `base-${Date.now()}` }),
      });
      if (res.ok) {
        setSaveMsg('Resume saved successfully');
      } else {
        setSaveMsg('Failed to save resume');
      }
    } catch {
      setSaveMsg('Failed to save resume');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }, [resume]);

  const triggerScrape = async () => {
    setScraping(true);
    try {
      await fetch('/api/cron/scrape', {
        method: 'POST',
        headers: { 'X-Cron-Secret': 'manual-trigger' },
      });
    } catch {
      // Ignore
    } finally {
      setTimeout(() => setScraping(false), 2000);
    }
  };

  if (!loaded) return null;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="text-xs text-muted mt-0.5">
          Configure your resume, search preferences, and automation
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. My Resume                                               */}
      {/* ────────────────────────────────────────────────────────── */}
      <Section icon={User} title="My Resume" description="Your base resume used for tailoring">
        {resumeLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-surface" />
            ))}
          </div>
        ) : !resume ? (
          <div className="text-sm text-muted py-4">
            No base resume found.{' '}
            <button
              onClick={() =>
                setResume({
                  id: 'base-v1',
                  fullName: '',
                  email: '',
                  phone: '',
                  linkedin: '',
                  github: '',
                  summary: '',
                  experience: [],
                  education: [],
                  skills: [],
                  certifications: [],
                  projects: [],
                })
              }
              className="text-accent hover:underline"
            >
              Create one
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Full Name" value={resume.fullName} onChange={(v) => setResume({ ...resume, fullName: v })} />
              <Input label="Email" value={resume.email} onChange={(v) => setResume({ ...resume, email: v })} />
              <Input label="Phone" value={resume.phone} onChange={(v) => setResume({ ...resume, phone: v })} />
              <Input label="LinkedIn" value={resume.linkedin} onChange={(v) => setResume({ ...resume, linkedin: v })} />
              <Input label="GitHub" value={resume.github} onChange={(v) => setResume({ ...resume, github: v })} />
            </div>

            {/* Summary */}
            <div>
              <Label>Summary</Label>
              <textarea
                value={resume.summary}
                onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-card-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none resize-none"
              />
            </div>

            {/* Skills */}
            <div>
              <Label>Skills</Label>
              <TagInput
                tags={resume.skills}
                onChange={(skills) => setResume({ ...resume, skills })}
                placeholder="Add a skill..."
              />
            </div>

            {/* Experience */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Work Experience</Label>
                <button
                  onClick={() =>
                    setResume({
                      ...resume,
                      experience: [
                        ...resume.experience,
                        { company: '', title: '', startDate: '', endDate: '', bullets: [''] },
                      ],
                    })
                  }
                  className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <div className="space-y-4">
                {resume.experience.map((exp, i) => (
                  <ExperienceEditor
                    key={i}
                    experience={exp}
                    onChange={(updated) => {
                      const arr = [...resume.experience];
                      arr[i] = updated;
                      setResume({ ...resume, experience: arr });
                    }}
                    onRemove={() =>
                      setResume({
                        ...resume,
                        experience: resume.experience.filter((_, j) => j !== i),
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveResume}
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Resume
              </button>
              <button className="flex items-center gap-2 rounded-md border border-card-border bg-surface px-4 py-2 text-sm text-muted hover:text-foreground">
                <FileDown className="h-4 w-4" />
                Preview PDF
              </button>
              {saveMsg && (
                <span className={`flex items-center gap-1 text-xs ${saveMsg.includes('success') ? 'text-success' : 'text-danger'}`}>
                  <CheckCircle className="h-3 w-3" />
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. Search Preferences                                      */}
      {/* ────────────────────────────────────────────────────────── */}
      <Section icon={Search} title="Search Preferences" description="What jobs to look for">
        <div className="space-y-5">
          <div>
            <Label>Job Titles</Label>
            <TagInput
              tags={settings.jobTitles}
              onChange={(v) => update('jobTitles', v)}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>

          <div>
            <Label>Preferred Locations</Label>
            <TagInput
              tags={settings.locations}
              onChange={(v) => update('locations', v)}
              placeholder="e.g. Bangalore, Remote"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Remote Only</p>
              <p className="text-[10px] text-muted mt-0.5">Only show remote/hybrid positions</p>
            </div>
            <Toggle checked={settings.remoteOnly} onChange={(v) => update('remoteOnly', v)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Min ATS Score Threshold</Label>
              <span className="font-mono text-sm text-foreground">{settings.minAtsScore}</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={settings.minAtsScore}
              onChange={(e) => update('minAtsScore', Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-muted mt-1">
              <span>50 (lenient)</span>
              <span>100 (strict)</span>
            </div>
          </div>

          <div>
            <Label>Sources to Scrape</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {SOURCES_LIST.map((src) => (
                <label
                  key={src.key}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    settings.sources[src.key]
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-card-border bg-surface text-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={settings.sources[src.key] ?? true}
                    onChange={(e) =>
                      update('sources', { ...settings.sources, [src.key]: e.target.checked })
                    }
                    className="accent-accent"
                  />
                  {src.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. Automation                                              */}
      {/* ────────────────────────────────────────────────────────── */}
      <Section icon={Cog} title="Automation" description="Scraping schedule and auto-apply">
        <div className="space-y-5">
          {/* Auto-apply */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Auto-Apply</p>
              <p className="text-[10px] text-muted mt-0.5">
                Automatically apply to jobs scoring above threshold
              </p>
            </div>
            <Toggle
              checked={settings.autoApply}
              onChange={(v) => {
                if (v && !confirm('Are you sure? Auto-apply will submit applications without manual review.')) {
                  return;
                }
                update('autoApply', v);
              }}
            />
          </div>

          {settings.autoApply && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Auto-apply is ON. Applications will be submitted automatically for approved jobs.
                Review your ATS threshold and sources carefully.
              </p>
            </div>
          )}

          {/* Schedule */}
          <div>
            <Label>Scrape Schedule</Label>
            <div className="flex gap-2 mt-1">
              {(['manual', 'daily', 'twice-daily'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => update('scrapeSchedule', opt)}
                  className={`rounded-md border px-4 py-2 text-xs font-medium transition-colors ${
                    settings.scrapeSchedule === opt
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-card-border bg-surface text-muted hover:text-foreground'
                  }`}
                >
                  {opt === 'manual' ? 'Manual Only' : opt === 'daily' ? 'Daily (8AM)' : 'Twice Daily'}
                </button>
              ))}
            </div>
          </div>

          {/* Manual scrape */}
          <div className="flex items-center gap-4">
            <button
              onClick={triggerScrape}
              disabled={scraping}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {scraping ? 'Running...' : 'Run Scraper Now'}
            </button>
          </div>

          {/* Worker status */}
          <div className="rounded-md border border-card-border bg-surface p-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">System Status</p>
            <div className="grid grid-cols-3 gap-4">
              <StatusIndicator label="Scraper Worker" active />
              <StatusIndicator label="Tailor Worker" active />
              <StatusIndicator label="Apply Worker" active />
            </div>
          </div>
        </div>
      </Section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. Notifications                                           */}
      {/* ────────────────────────────────────────────────────────── */}
      <Section icon={Bell} title="Notifications" description="Email alerts and triggers">
        <div className="space-y-5">
          <div>
            <Label>Notification Email</Label>
            <input
              type="email"
              value={settings.notifyEmail}
              onChange={(e) => update('notifyEmail', e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-card-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
            />
          </div>

          <NotificationToggle
            label="High-score job found"
            description="When a job scores above your ATS threshold"
            checked={settings.notifyHighScore}
            onChange={(v) => update('notifyHighScore', v)}
          />
          <NotificationToggle
            label="Application submitted"
            description="When an application is sent successfully"
            checked={settings.notifyApplicationSent}
            onChange={(v) => update('notifyApplicationSent', v)}
          />
          <NotificationToggle
            label="Interview invite"
            description="When a response status changes to interview"
            checked={settings.notifyInterview}
            onChange={(v) => update('notifyInterview', v)}
          />
        </div>
      </Section>

      <div className="h-8" />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-card-border bg-card">
      <div className="flex items-center gap-3 border-b border-card-border px-5 py-4">
        <Icon className="h-4 w-4 text-accent" />
        <div>
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <p className="text-[10px] text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-card-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted mb-1.5">{children}</p>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? 'bg-accent' : 'bg-card-border'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function StatusIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${active ? 'bg-success' : 'bg-muted/40'}`}
        />
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-[10px] text-muted mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function ExperienceEditor({
  experience,
  onChange,
  onRemove,
}: {
  experience: WorkExperience;
  onChange: (exp: WorkExperience) => void;
  onRemove: () => void;
}) {
  const updateBullet = (index: number, value: string) => {
    const bullets = [...experience.bullets];
    bullets[index] = value;
    onChange({ ...experience, bullets });
  };

  const addBullet = () => {
    onChange({ ...experience, bullets: [...experience.bullets, ''] });
  };

  const removeBullet = (index: number) => {
    onChange({
      ...experience,
      bullets: experience.bullets.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="rounded-md border border-card-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-3 flex-1 mr-3">
          <input
            value={experience.company}
            onChange={(e) => onChange({ ...experience, company: e.target.value })}
            placeholder="Company"
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
          />
          <input
            value={experience.title}
            onChange={(e) => onChange({ ...experience, title: e.target.value })}
            placeholder="Title"
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
          />
          <input
            value={experience.startDate}
            onChange={(e) => onChange({ ...experience, startDate: e.target.value })}
            placeholder="Start (2022-01)"
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
          />
          <input
            value={experience.endDate}
            onChange={(e) => onChange({ ...experience, endDate: e.target.value })}
            placeholder="End (present)"
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
          />
        </div>
        <button onClick={onRemove} className="p-1 text-danger/60 hover:text-danger shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Bullets */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted">Bullets</p>
        {experience.bullets.map((bullet, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-muted/40">•</span>
            <input
              value={bullet}
              onChange={(e) => updateBullet(i, e.target.value)}
              placeholder="Achievement or responsibility..."
              className="flex-1 rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => removeBullet(i)}
              className="text-muted/40 hover:text-danger"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={addBullet}
          className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80"
        >
          <Plus className="h-3 w-3" /> Add bullet
        </button>
      </div>
    </div>
  );
}

