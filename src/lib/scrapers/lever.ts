import { BaseScraper, type ScrapedJob } from './base';

// ── Target companies known to use Lever ───────────────────────────

const LEVER_COMPANIES = [
  'netflix',
  'openai',
  'anthropic',
  'databricks',
  'anduril',
  'scale',
  'faire',
  'lacework',
  'cockroachlabs',
  'nerdwallet',
  'samsara',
  'verkada',
  'relativityspace',
  'devoted',
  'liftoff',
  'fleetsmith',
  'persona',
  'replit',
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

const API_BASE = 'https://api.lever.co/v0/postings';
const RATE_LIMIT_MS = 500;

// ── Types for the Lever API response ──────────────────────────────

interface LeverPosting {
  id: string;
  text: string; // job title
  categories: {
    team?: string;
    location?: string;
    commitment?: string;
    department?: string;
  };
  hostedUrl: string;
  descriptionPlain?: string;
  description?: string;
  lists?: { text: string; content: string }[];
  additional?: string;
  additionalPlain?: string;
}

// ── Scraper ───────────────────────────────────────────────────────

export class LeverScraper extends BaseScraper {
  constructor() {
    super('lever');
  }

  /** Lever uses a public JSON API — no browser needed. */
  override async init(): Promise<void> {
    // No-op: we use fetch, not Playwright.
  }

  override async close(): Promise<void> {
    // No-op.
  }

  async scrape(_query: string, _location?: string): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    for (const company of LEVER_COMPANIES) {
      try {
        const fetched = await this.fetchCompanyJobs(company);
        jobs.push(...fetched);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[lever] failed for ${company}: ${msg}`);
      }

      await delay(RATE_LIMIT_MS);
    }

    console.log(`[lever] scraped ${jobs.length} relevant jobs from ${LEVER_COMPANIES.length} companies`);
    return jobs;
  }

  // ── Private ───────────────────────────────────────────────────

  private async fetchCompanyJobs(company: string): Promise<ScrapedJob[]> {
    const url = `${API_BASE}/${company}?mode=json`;
    const res = await fetch(url);

    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`HTTP ${res.status} for ${company}`);
    }

    const postings = (await res.json()) as LeverPosting[];

    return postings
      .filter((p) => isRelevantTitle(p.text))
      .map((p) =>
        this.normalizeJobData({
          title: p.text,
          company: formatCompanyName(company),
          location: p.categories?.location ?? 'Remote',
          url: p.hostedUrl,
          jdText: buildJdText(p),
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

function buildJdText(posting: LeverPosting): string {
  const parts: string[] = [];

  if (posting.descriptionPlain) {
    parts.push(posting.descriptionPlain);
  } else if (posting.description) {
    parts.push(stripHtml(posting.description));
  }

  if (posting.lists) {
    for (const list of posting.lists) {
      parts.push(`${list.text}:\n${stripHtml(list.content)}`);
    }
  }

  if (posting.additionalPlain) {
    parts.push(posting.additionalPlain);
  } else if (posting.additional) {
    parts.push(stripHtml(posting.additional));
  }

  return parts.join('\n\n').replace(/\s+/g, ' ').trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<li>/g, '\n• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
