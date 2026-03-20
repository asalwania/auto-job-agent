import { BaseScraper, type ScrapedJob } from './base';

const MAX_JOBS = 20;
const SCROLL_ROUNDS = 3;

interface JobCard {
  title: string;
  company: string;
  location: string;
  url: string;
}

export class WellfoundScraper extends BaseScraper {
  constructor() {
    super('wellfound');
  }

  async scrape(_query: string, _location?: string): Promise<ScrapedJob[]> {
    if (!this.page) throw new Error('Browser not initialised — call init() first');

    const searchUrl = 'https://wellfound.com/role/r/software-engineer';

    console.log(`[wellfound] navigating to ${searchUrl}`);
    await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Check for blocking / CAPTCHA
    if (await this.isBlocked()) {
      console.warn('[wellfound] blocked or CAPTCHA detected — returning empty');
      return [];
    }

    // Wait for job listings
    try {
      await this.page.waitForSelector(
        '[data-test="StartupResult"], .styles_jobListing__title, .job-listing-container',
        { timeout: 15_000 },
      );
    } catch {
      console.warn('[wellfound] job listings not found — page may be empty or changed');
      return [];
    }

    // Scroll to load more
    await this.scrollToLoadMore();

    const cards = await this.extractJobCards();
    console.log(`[wellfound] found ${cards.length} cards`);

    // Visit each detail page
    const jobs: ScrapedJob[] = [];
    for (const card of cards) {
      try {
        const detail = await this.fetchJobDetail(card);
        jobs.push(detail);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[wellfound] failed to fetch detail for ${card.url}: ${msg}`);
      }

      await this.randomDelay(1500, 3500);
    }

    console.log(`[wellfound] scraped ${jobs.length} jobs with details`);
    return jobs;
  }

  // ── Private helpers ───────────────────────────────────────────

  private async isBlocked(): Promise<boolean> {
    if (!this.page) return false;
    return this.page.evaluate(() => {
      const body = document.body.innerText.toLowerCase();
      const html = document.documentElement.innerHTML.toLowerCase();
      return (
        body.includes('captcha') ||
        body.includes('access denied') ||
        body.includes('blocked') ||
        html.includes('g-recaptcha') ||
        html.includes('cf-challenge')
      );
    });
  }

  private async scrollToLoadMore(): Promise<void> {
    if (!this.page) return;

    for (let i = 0; i < SCROLL_ROUNDS; i++) {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.randomDelay(2000, 4000);

      // Click "Load more" if present
      try {
        const loadMore = this.page.locator('button:has-text("Load more"), button:has-text("Show more"):visible');
        if (await loadMore.count()) {
          await loadMore.first().click();
          await this.randomDelay(1500, 3000);
        }
      } catch {
        // No button — that's fine
      }
    }
  }

  private async extractJobCards(): Promise<JobCard[]> {
    if (!this.page) return [];

    const cards = await this.page.$$eval(
      '[data-test="StartupResult"], .styles_jobListing__title, .job-listing-container, [class*="jobListing"]',
      (els, max) =>
        els.slice(0, max).map((el) => {
          // Title
          const titleEl =
            el.querySelector('[data-test="JobListingTitle"] a') ??
            el.querySelector('a[class*="jobTitle"]') ??
            el.querySelector('h2 a, h3 a, a.company-name');
          const title = titleEl?.textContent?.trim() ?? '';
          const url = (titleEl as HTMLAnchorElement)?.href ?? '';

          // Company
          const company =
            el.querySelector('[data-test="StartupName"] a')?.textContent?.trim() ??
            el.querySelector('a[class*="companyName"]')?.textContent?.trim() ??
            el.querySelector('h2 a')?.textContent?.trim() ??
            '';

          // Location
          const location =
            el.querySelector('[data-test="Location"] span')?.textContent?.trim() ??
            el.querySelector('span[class*="location"]')?.textContent?.trim() ??
            'Remote';

          return { title, company, location, url };
        }),
      MAX_JOBS,
    );

    return cards.filter((c) => (c.title || c.company) && c.url);
  }

  private async fetchJobDetail(card: JobCard): Promise<ScrapedJob> {
    if (!this.page) throw new Error('No page available');

    await this.page.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    if (await this.isBlocked()) {
      console.warn(`[wellfound] blocked on detail page — using card data only`);
      return this.normalizeJobData({ ...card, jdText: '' });
    }

    let jdText = '';

    // Wellfound uses several possible selectors for JD
    const jdSelectors = [
      '[data-test="JobDescription"]',
      '.job-description',
      '[class*="jobDescription"]',
      '[class*="description"] .content',
      '.styles_description__',
    ];

    for (const selector of jdSelectors) {
      try {
        const el = await this.page.$(selector);
        if (el) {
          jdText = (await el.textContent()) ?? '';
          if (jdText.trim()) break;
        }
      } catch {
        // Try next selector
      }
    }

    return this.normalizeJobData({ ...card, jdText });
  }
}
