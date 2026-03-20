export { redisConnection } from './redis';
export { scraperQueue, tailorQueue, applyQueue, SCRAPER_QUEUE, TAILOR_QUEUE, APPLY_QUEUE } from './queues';
export { startAllWorkers } from './workers';
export { startScheduler, stopScheduler } from './scheduler';

/**
 * Initialize the full queue system: workers + cron scheduler.
 * Call this once at app startup (e.g., in a custom server or instrumentation file).
 */
export async function initQueueSystem() {
  const { startAllWorkers: start } = await import('./workers');
  const { startScheduler: schedule } = await import('./scheduler');
  const workers = start();
  schedule();
  return workers;
}
