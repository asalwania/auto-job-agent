import { BaseScraper, type ScrapedJob } from './base';

const MAX_JOBS = 25;
const SCROLL_ROUNDS = 3;
const RATE_LIMIT_WAIT = 30_000;

interface JobCard {
  title: string;
  company: string;
  location: string;
  url: string;
}

export class LinkedInScraper extends BaseScraper {
  constructor() {
    super('linkedin');
  }

  async scrape(query: string, location = 'India'): Promise<ScrapedJob[]> {
    if (!this.page) throw new Error('Browser not initialised — call init() first');

    const searchUrl =
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}` +
      `&location=${encodeURIComponent(location)}&f_WT=2`;

    console.log(`[linkedin] navigating to ${searchUrl}`);
    await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Handle login wall
    if (this.isLoginPage()) {
      const loggedIn = await this.loginIfRequired();
      if (!loggedIn) {
        console.warn('[linkedin] login required but failed — returning empty');
        return [];
      }
      // Re-navigate after login
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    }

    // Handle rate limiting / CAPTCHA
    if (await this.isRateLimited()) {
      console.warn(`[linkedin] rate limited — waiting ${RATE_LIMIT_WAIT / 1000}s`);
      await this.page.waitForTimeout(RATE_LIMIT_WAIT);
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      if (await this.isRateLimited()) {
        console.error('[linkedin] still rate limited after retry — aborting');
        return [];
      }
    }

    // Wait for results list
    try {
      await this.page.waitForSelector('.jobs-search__results-list', { timeout: 15_000 });
    } catch {
      console.warn('[linkedin] results list not found — page might be empty or blocked');
      return [];
    }

    // Scroll to load more cards
    await this.scrollToLoadMore();

    // Extract job cards from the listing page
    const cards = await this.extractJobCards();
    console.log(`[linkedin] found ${cards.length} cards`);

    // Visit each detail page
    const jobs: ScrapedJob[] = [];
    for (const card of cards) {
      try {
        const detail = await this.fetchJobDetail(card);
        jobs.push(detail);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[linkedin] failed to fetch detail for ${card.url}: ${msg}`);
      }

      await this.randomDelay(1500, 4000);
    }

    console.log(`[linkedin] scraped ${jobs.length} jobs with details`);
    return jobs;
  }

  // ── Private helpers ───────────────────────────────────────────

  private isLoginPage(): boolean {
    const url = this.page?.url() ?? '';
    return url.includes('/login') || url.includes('/checkpoint');
  }

  private async loginIfRequired(): Promise<boolean> {
    if (!this.page) return false;

    const email = process.env.MY_LINKEDIN_EMAIL;
    const password = process.env.MY_LINKEDIN_PASSWORD;

    if (!email || !password) {
      console.error('[linkedin] MY_LINKEDIN_EMAIL / MY_LINKEDIN_PASSWORD not set');
      return false;
    }

    console.log('[linkedin] login wall detected — attempting sign in');

    try {
      await this.page.waitForSelector('#username', { timeout: 10_000 });

      await this.page.fill('#username', email);
      await this.randomDelay(500, 1000);
      await this.page.fill('#password', password);
      await this.randomDelay(500, 1000);

      await this.page.click('button[type="submit"]');
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30_000 });

      // Post-login cooldown
      await this.page.waitForTimeout(3000);

      if (this.isLoginPage()) {
        console.error('[linkedin] still on login page after submit — credentials may be wrong');
        return false;
      }

      console.log('[linkedin] login successful');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[linkedin] login failed: ${msg}`);
      return false;
    }
  }

  private async isRateLimited(): Promise<boolean> {
    if (!this.page) return false;
    const status = await this.page.evaluate(() => {
      // Check for 429 text or CAPTCHA challenges
      const body = document.body.innerText.toLowerCase();
      return (
        body.includes('rate limit') ||
        body.includes('too many requests') ||
        body.includes('captcha') ||
        body.includes('unusual activity') ||
        body.includes('security verification')
      );
    });
    return status;
  }

  private async scrollToLoadMore(): Promise<void> {
    if (!this.page) return;

    for (let i = 0; i < SCROLL_ROUNDS; i++) {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.randomDelay(2000, 4000);

      // Click "See more jobs" button if it appears
      try {
        const seeMore = this.page.locator('button.infinite-scroller__show-more-button:visible');
        if (await seeMore.count()) {
          await seeMore.click();
          await this.randomDelay(1500, 3000);
        }
      } catch {
        // Button not present — that's fine
      }
    }
  }

  private async extractJobCards(): Promise<JobCard[]> {
    if (!this.page) return [];

    const cards = await this.page.$$eval(
      '.jobs-search__results-list .base-search-card',
      (els, max) =>
        els.slice(0, max).map((el) => ({
          title:
            el.querySelector('.base-search-card__title')?.textContent?.trim() ?? '',
          company:
            el.querySelector('.base-search-card__subtitle')?.textContent?.trim() ?? '',
          location:
            el.querySelector('.job-search-card__location')?.textContent?.trim() ?? '',
          url:
            (el.querySelector('a.base-card__full-link') as HTMLAnchorElement)?.href ?? '',
        })),
      MAX_JOBS,
    );

    // Filter out cards missing essential data
    return cards.filter((c) => c.title && c.url);
  }

  private async fetchJobDetail(card: JobCard): Promise<ScrapedJob> {
    if (!this.page) throw new Error('No page available');

    await this.page.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    // Handle login wall on detail page
    if (this.isLoginPage()) {
      console.warn(`[linkedin] login wall on detail page — using card data only`);
      return this.normalizeJobData({ ...card, jdText: '' });
    }

    // Extract JD text
    let jdText = '';
    try {
      await this.page.waitForSelector('.show-more-less-html__markup', { timeout: 8_000 });
      jdText = await this.page.$eval(
        '.show-more-less-html__markup',
        (el) => el.textContent?.trim() ?? '',
      );
    } catch {
      // Some pages hide JD behind "Show more" — try clicking it
      try {
        const showMore = this.page.locator('button.show-more-less-html__button--more:visible');
        if (await showMore.count()) {
          await showMore.click();
          await this.page.waitForTimeout(500);
          jdText = await this.page.$eval(
            '.show-more-less-html__markup',
            (el) => el.textContent?.trim() ?? '',
          );
        }
      } catch {
        console.warn(`[linkedin] could not extract JD for ${card.url}`);
      }
    }

    // Check for Easy Apply
    const hasEasyApply = await this.page
      .locator('.jobs-apply-button--top-card')
      .count()
      .then((c) => c > 0)
      .catch(() => false);

    return {
      ...this.normalizeJobData({ ...card, jdText }),
      hasEasyApply,
    };
  }
}
