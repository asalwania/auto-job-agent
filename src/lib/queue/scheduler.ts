import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { scraperQueue } from './queues';

let task: ScheduledTask | null = null;

const DEFAULT_QUERY = 'Full Stack Developer';
const DEFAULT_LOCATION = 'India';

/**
 * Start the cron scheduler.
 * Runs every day at 8:00 AM IST (2:30 AM UTC).
 */
export function startScheduler(): void {
  if (task) {
    console.warn('[scheduler] already running');
    return;
  }

  // Cron: minute 30, hour 2, every day — 02:30 UTC = 08:00 IST
  task = cron.schedule('30 2 * * *', async () => {
    console.log('[scheduler] triggering daily scrape');

    try {
      await scraperQueue.add('daily-scrape', {
        query: DEFAULT_QUERY,
        location: DEFAULT_LOCATION,
      });
    } catch (err) {
      console.error('[scheduler] failed to add scrape job:', err);
    }
  });

  console.log('[scheduler] started — daily scrape at 08:00 IST (02:30 UTC)');
}

/** Stop the cron scheduler. */
export function stopScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[scheduler] stopped');
  }
}
