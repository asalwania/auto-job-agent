import { BaseScraper, type ScrapedJob } from './base';
import { upsertJob } from '@/lib/db/jobs';
import { createServiceClient } from '@/lib/db/client';

// ── Register scrapers here ────────────────────────────────────────

import { LinkedInScraper } from './linkedin';
// import { NaukriScraper } from './naukri';

function getScrapers(): BaseScraper[] {
  return [
    new LinkedInScraper(),
    // new NaukriScraper(),
  ];
}

// ── Result type ───────────────────────────────────────────────────

export interface ScrapeRunResult {
  totalFound: number;
  newJobs: number;
  errors: { source: string; message: string }[];
}

// ── Main runner ───────────────────────────────────────────────────

export async function runScrapers(
  query: string,
  location?: string,
): Promise<ScrapeRunResult> {
  const scrapers = getScrapers();
  const result: ScrapeRunResult = { totalFound: 0, newJobs: 0, errors: [] };

  for (const scraper of scrapers) {
    let scraped: ScrapedJob[] = [];

    try {
      await scraper.init();
      scraped = await scraper.scrape(query, location);
      result.totalFound += scraped.length;

      for (const job of scraped) {
        const saved = await saveIfNew(job);
        if (saved) result.newJobs++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${scraper.source}] scrape failed:`, message);
      result.errors.push({ source: scraper.source, message });
    } finally {
      await scraper.close();
    }

    await logScrapeRun(scraper.source, scraped.length, result.newJobs, result.errors);
  }

  console.log(
    `Scrape complete: ${result.totalFound} found, ${result.newJobs} new, ${result.errors.length} errors`,
  );

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────

async function saveIfNew(job: ScrapedJob): Promise<boolean> {
  const row = await upsertJob({
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.url,
    source: job.source,
    jd_text: job.jdText,
    jd_hash: job.jdText
      ? (await import('crypto')).createHash('md5').update(job.jdText).digest('hex')
      : null,
    required_skills: [],
    nice_to_have_skills: [],
    experience_years: null,
    role_level: 'unknown',
    ats_score: null,
    status: 'pending',
  });

  // upsertJob returns null on error; if the row's status is still 'pending'
  // and it was just created (scraped_at ≈ now), it's new.
  return row !== null;
}

async function logScrapeRun(
  source: string,
  jobsFound: number,
  jobsNew: number,
  errors: { source: string; message: string }[],
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const sourceErrors = errors.filter((e) => e.source === source);

    await supabase.from('scrape_logs').insert({
      source,
      jobs_found: jobsFound,
      jobs_new: jobsNew,
      errors: sourceErrors,
    } as never);
  } catch (err) {
    console.error('Failed to log scrape run:', err);
  }
}
