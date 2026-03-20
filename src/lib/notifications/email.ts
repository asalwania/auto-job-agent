import { Resend } from 'resend';
import type { Job, TailoredResume, Application } from '@/types';

// ── Client (lazy — no-op if key missing) ──────────────────────────

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = 'Job Agent <onboarding@resend.dev>';

function getTo(): string | null {
  return process.env.MY_EMAIL || null;
}

const DASHBOARD_URL = 'http://localhost:3000';

// ── Shared styles ─────────────────────────────────────────────────

const STYLES = {
  body: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f1117; color: #e2e8f0; padding: 32px; max-width: 560px; margin: 0 auto;',
  card: 'background: #1a1d27; border: 1px solid #2a2d3a; border-radius: 12px; padding: 24px; margin-bottom: 16px;',
  h1: 'color: #e2e8f0; font-size: 20px; font-weight: 700; margin: 0 0 4px 0;',
  h2: 'color: #e2e8f0; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;',
  sub: 'color: #64748b; font-size: 13px; margin: 0;',
  score: 'font-family: monospace; font-size: 48px; font-weight: 800; margin: 8px 0;',
  badgeGreen: 'display: inline-block; background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); border-radius: 9999px; padding: 2px 10px; font-size: 11px; font-weight: 500; margin: 2px;',
  badgeOrange: 'display: inline-block; background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.2); border-radius: 9999px; padding: 2px 10px; font-size: 11px; font-weight: 500; margin: 2px;',
  btn: 'display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;',
  muted: 'color: #64748b; font-size: 12px;',
};

// ── 1. New Job Alert ──────────────────────────────────────────────

export async function sendNewJobAlert(
  job: Job,
  tailoredResume: TailoredResume,
): Promise<void> {
  const client = getClient();
  const to = getTo();
  if (!client || !to) return;

  const scoreColor = tailoredResume.atsScore >= 75 ? '#22c55e' : tailoredResume.atsScore >= 50 ? '#eab308' : '#ef4444';

  const coveredBadges = tailoredResume.coveredKeywords
    .map((kw) => `<span style="${STYLES.badgeGreen}">${esc(kw)}</span>`)
    .join(' ');

  const missingBadges = tailoredResume.missingKeywords
    .map((kw) => `<span style="${STYLES.badgeOrange}">${esc(kw)}</span>`)
    .join(' ');

  const html = `
<div style="${STYLES.body}">
  <div style="${STYLES.card}">
    <h1 style="${STYLES.h1}">${esc(job.title)}</h1>
    <p style="${STYLES.sub}">${esc(job.company)} · ${esc(job.location)}</p>
  </div>

  <div style="${STYLES.card} text-align: center;">
    <p style="${STYLES.muted}">ATS MATCH SCORE</p>
    <div style="${STYLES.score} color: ${scoreColor};">${tailoredResume.atsScore}</div>
    <p style="${STYLES.muted}">out of 100</p>
  </div>

  ${coveredBadges ? `
  <div style="${STYLES.card}">
    <p style="${STYLES.muted} margin-bottom: 8px;">COVERED KEYWORDS</p>
    <div>${coveredBadges}</div>
  </div>` : ''}

  ${missingBadges ? `
  <div style="${STYLES.card}">
    <p style="${STYLES.muted} margin-bottom: 8px;">MISSING KEYWORDS</p>
    <div>${missingBadges}</div>
  </div>` : ''}

  <div style="text-align: center; margin-top: 24px;">
    <a href="${DASHBOARD_URL}/jobs" style="${STYLES.btn}">Review in Dashboard</a>
  </div>

  <p style="${STYLES.muted} text-align: center; margin-top: 24px;">
    <a href="${esc(job.url)}" style="color: #3b82f6; text-decoration: none;">View original posting →</a>
  </p>
</div>`;

  try {
    await client.emails.send({
      from: FROM,
      to,
      subject: `🎯 New match: ${job.title} at ${job.company} — ATS ${tailoredResume.atsScore}/100`,
      html,
    });
  } catch (err) {
    console.error('[email] sendNewJobAlert failed:', err);
  }
}

// ── 2. Application Confirmation ───────────────────────────────────

export async function sendApplicationConfirmation(
  job: Job,
  application: Application,
): Promise<void> {
  const client = getClient();
  const to = getTo();
  if (!client || !to) return;

  const html = `
<div style="${STYLES.body}">
  <div style="${STYLES.card}">
    <h1 style="${STYLES.h1}">Application Submitted</h1>
    <p style="${STYLES.sub}">Your application has been sent successfully.</p>
  </div>

  <div style="${STYLES.card}">
    <h2 style="${STYLES.h2}">${esc(job.title)}</h2>
    <p style="${STYLES.sub}">${esc(job.company)} · ${esc(job.location)}</p>
    <p style="${STYLES.sub} margin-top: 12px;">Source: ${esc(job.source)}</p>
    ${application.notes ? `<p style="${STYLES.muted} margin-top: 8px;">${esc(application.notes)}</p>` : ''}
  </div>

  <div style="text-align: center; margin-top: 24px;">
    <a href="${DASHBOARD_URL}/applications" style="${STYLES.btn}">View in Tracker</a>
  </div>
</div>`;

  try {
    await client.emails.send({
      from: FROM,
      to,
      subject: `✅ Applied to ${job.title} at ${job.company}`,
      html,
    });
  } catch (err) {
    console.error('[email] sendApplicationConfirmation failed:', err);
  }
}

// ── 3. Weekly Summary ─────────────────────────────────────────────

export async function sendWeeklySummary(stats: {
  applied: number;
  interviews: number;
  avgScore: number;
}): Promise<void> {
  const client = getClient();
  const to = getTo();
  if (!client || !to) return;

  const html = `
<div style="${STYLES.body}">
  <div style="${STYLES.card}">
    <h1 style="${STYLES.h1}">Weekly Job Hunt Summary</h1>
    <p style="${STYLES.sub}">Here's how your past week went.</p>
  </div>

  <div style="${STYLES.card}">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #2a2d3a;">
          <span style="${STYLES.muted}">Applications Sent</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #2a2d3a; text-align: right; font-family: monospace; font-size: 24px; font-weight: 700; color: #3b82f6;">
          ${stats.applied}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #2a2d3a;">
          <span style="${STYLES.muted}">Interview Invites</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #2a2d3a; text-align: right; font-family: monospace; font-size: 24px; font-weight: 700; color: #22c55e;">
          ${stats.interviews}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <span style="${STYLES.muted}">Avg ATS Score</span>
        </td>
        <td style="padding: 12px 0; text-align: right; font-family: monospace; font-size: 24px; font-weight: 700; color: #e2e8f0;">
          ${stats.avgScore}%
        </td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; margin-top: 24px;">
    <a href="${DASHBOARD_URL}/analytics" style="${STYLES.btn}">View Analytics</a>
  </div>
</div>`;

  try {
    await client.emails.send({
      from: FROM,
      to,
      subject: `📊 Weekly job hunt summary — ${stats.applied} applied, ${stats.interviews} interviews`,
      html,
    });
  } catch (err) {
    console.error('[email] sendWeeklySummary failed:', err);
  }
}

// ── Util ──────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
