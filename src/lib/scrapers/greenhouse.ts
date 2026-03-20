import { BaseScraper, type ScrapedJob } from './base';

// ── Target companies known to use Greenhouse ──────────────────────

const GREENHOUSE_COMPANIES = [
  'airbnb',
  'cloudflare',
  'datadog',
  'discord',
  'figma',
  'hashicorp',
  'hubspot',
  'netlify',
  'notion',
  'okta',
  'plaid',
  'postman',
  'snyk',
  'sqsp',
  'stripe',
  'twilio',
  'vercel',
  'watershed',
];

const TITLE_KEYWORDS = [
  'engineer',
  'developer',
  'full stack',
  'fullstack',
  'frontend',
  'front end',
  'backend',
  'back end',
  'ai',
  'ml',
  'llm',
  'machine learning',
];

const API_BASE = 'https://boards-api.greenhouse.io/v1/boards';
const RATE_LIMIT_MS = 500;

// ── Types for the Greenhouse API response ─────────────────────────

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  content: string;
  updated_at: string;
  metadata?: { id: number; name: string; value: string | string[] | null }[];
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

// ── Scraper ───────────────────────────────────────────────────────

export class GreenhouseScraper extends BaseScraper {
  constructor() {
    super('greenhouse');
  }

  /** Greenhouse uses a public JSON API — no browser needed. */
  override async init(): Promise<void> {
    // No-op: we use fetch, not Playwright.
  }

  override async close(): Promise<void> {
    // No-op.
  }

  async scrape(_query: string, _location?: string): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    for (const company of GREENHOUSE_COMPANIES) {
      try {
        const fetched = await this.fetchCompanyJobs(company);
        jobs.push(...fetched);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[greenhouse] failed for ${company}: ${msg}`);
      }

      // Rate limit between companies
      await delay(RATE_LIMIT_MS);
    }

    console.log(`[greenhouse] scraped ${jobs.length} relevant jobs from ${GREENHOUSE_COMPANIES.length} companies`);
    return jobs;
  }

  // ── Private ───────────────────────────────────────────────────

  private async fetchCompanyJobs(company: string): Promise<ScrapedJob[]> {
    const url = `${API_BASE}/${company}/jobs?content=true`;
    const res = await fetch(url);

    if (!res.ok) {
      if (res.status === 404) return []; // Board doesn't exist or is private
      throw new Error(`HTTP ${res.status} for ${company}`);
    }

    const data = (await res.json()) as GreenhouseResponse;

    return data.jobs
      .filter((job) => isRelevantTitle(job.title))
      .map((job) =>
        this.normalizeJobData({
          title: job.title,
          company: formatCompanyName(company),
          location: job.location?.name ?? 'Remote',
          url: job.absolute_url,
          jdText: stripHtml(job.content ?? ''),
        }),
      );
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function isRelevantTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}

function formatCompanyName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
