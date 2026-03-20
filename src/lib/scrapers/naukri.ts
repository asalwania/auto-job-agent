import { BaseScraper, type ScrapedJob } from './base';

const MAX_JOBS = 20;

interface JobCard {
  title: string;
  company: string;
  location: string;
  url: string;
}

export class NaukriScraper extends BaseScraper {
  constructor() {
    super('naukri');
  }

  async scrape(query: string, location = 'Chandigarh'): Promise<ScrapedJob[]> {
    if (!this.page) throw new Error('Browser not initialised — call init() first');

    // Set extra headers to reduce anti-bot friction
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    });

    const querySlug = toSlug(query);
    const locationSlug = toSlug(location);
    const searchUrl = `https://www.naukri.com/${querySlug}-jobs-in-${locationSlug}?jobAge=7`;

    console.log(`[naukri] navigating to ${searchUrl}`);
    await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // CAPTCHA / block detection
    if (await this.isCaptchaPage()) {
      console.warn('[naukri] CAPTCHA detected — skipping');
      return [];
    }

    // Wait for job listing to appear
    try {
      await this.page.waitForSelector('.list .jobTuple, .srp-jobtuple-wrapper, article.jobTuple', {
        timeout: 15_000,
      });
    } catch {
      console.warn('[naukri] job listing not found — page may be empty or blocked');
      return [];
    }

    const cards = await this.extractJobCards();
    console.log(`[naukri] found ${cards.length} cards`);

    // Visit each detail page
    const jobs: ScrapedJob[] = [];
    for (const card of cards) {
      try {
        const detail = await this.fetchJobDetail(card);
        jobs.push(detail);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[naukri] failed to fetch detail for ${card.url}: ${msg}`);
      }

      await this.randomDelay(1500, 3500);
    }

    console.log(`[naukri] scraped ${jobs.length} jobs with details`);
    return jobs;
  }

  // ── Private helpers ───────────────────────────────────────────

  private async isCaptchaPage(): Promise<boolean> {
    if (!this.page) return false;
    return this.page.evaluate(() => {
      const body = document.body.innerText.toLowerCase();
      const html = document.documentElement.innerHTML.toLowerCase();
      return (
        body.includes('captcha') ||
        body.includes('are you a robot') ||
        body.includes('unusual traffic') ||
        html.includes('g-recaptcha') ||
        html.includes('cf-challenge')
      );
    });
  }

  private async extractJobCards(): Promise<JobCard[]> {
    if (!this.page) return [];

    const cards = await this.page.$$eval(
      '.list .jobTuple, .srp-jobtuple-wrapper, article.jobTuple',
      (els, max) =>
        els.slice(0, max).map((el) => {
          // Title + URL
          const titleEl =
            el.querySelector('.title a') ??
            el.querySelector('a.title') ??
            el.querySelector('.row1 a');
          const title = titleEl?.textContent?.trim() ?? '';
          const url = (titleEl as HTMLAnchorElement)?.href ?? '';

          // Company
          const company =
            el.querySelector('.subTitle a')?.textContent?.trim() ??
            el.querySelector('.comp-name a')?.textContent?.trim() ??
            el.querySelector('.companyInfo a')?.textContent?.trim() ??
            '';

          // Location — grab the last .ellipsis or .locWdth / .loc
          const locEls = el.querySelectorAll('.ellipsis, .locWdth, .loc, .ni-job-tuple-icon-srp-location');
          const location = locEls.length
            ? locEls[locEls.length - 1]?.textContent?.trim() ?? ''
            : '';

          return { title, company, location, url };
        }),
      MAX_JOBS,
    );

    return cards.filter((c) => c.title && c.url);
  }

  private async fetchJobDetail(card: JobCard): Promise<ScrapedJob> {
    if (!this.page) throw new Error('No page available');

    await this.page.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    if (await this.isCaptchaPage()) {
      console.warn(`[naukri] CAPTCHA on detail page — using card data only`);
      return this.normalizeJobData({ ...card, jdText: '' });
    }

    let jdText = '';

    // Try multiple selectors Naukri uses for JD
    const jdSelectors = [
      '.job-desc',
      '.dang-inner-html',
      '#job_description',
      '.jobDescSection .description',
      'section.job-desc',
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

// ── Helpers ───────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}
