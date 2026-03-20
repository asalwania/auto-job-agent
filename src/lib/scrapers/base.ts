import { chromium, type Browser, type Page } from 'playwright';
import { createHash } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  jdText: string;
  source: string;
}

// ── User agents pool ──────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

// ── Abstract base class ───────────────────────────────────────────

export abstract class BaseScraper {
  readonly source: string;
  protected browser: Browser | null = null;
  protected page: Page | null = null;

  constructor(source: string) {
    this.source = source;
  }

  /** Launch headless Chromium with stealth-ish settings. */
  async init(): Promise<void> {
    const width = randomInt(1280, 1920);
    const height = randomInt(800, 1080);

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const context = await this.browser.newContext({
      userAgent: USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)],
      viewport: { width, height },
      locale: 'en-US',
    });

    this.page = await context.newPage();
  }

  /** Close the browser and clean up. */
  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }

  /** Scrape jobs for a given query and optional location. */
  abstract scrape(query: string, location?: string): Promise<ScrapedJob[]>;

  /** Sleep for a random duration to mimic human browsing. */
  protected async randomDelay(min = 1000, max = 3000): Promise<void> {
    const ms = randomInt(min, max);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** MD5 hash of the given text (for JD deduplication). */
  protected generateHash(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }

  /** Normalize raw scraped data into a clean ScrapedJob. */
  protected normalizeJobData(raw: {
    title?: string;
    company?: string;
    location?: string;
    url?: string;
    jdText?: string;
  }): ScrapedJob {
    return {
      title: clean(raw.title),
      company: clean(raw.company),
      location: clean(raw.location),
      url: (raw.url ?? '').trim(),
      jdText: clean(raw.jdText),
      source: this.source,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clean(value?: string): string {
  return (value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}
