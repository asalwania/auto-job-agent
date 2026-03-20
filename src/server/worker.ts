/**
 * Standalone BullMQ worker process.
 *
 * Usage:
 *   npx tsx src/server/worker.ts
 *   npm run worker
 *   npm run worker:dev   (with watch mode)
 */

import 'dotenv/config';
import { startAllWorkers, startScheduler, stopScheduler } from '../lib/queue';
import { scraperQueue, tailorQueue, applyQueue } from '../lib/queue/queues';
import { startHealthServer, stopHealthServer } from './health';

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// ── Boot ──────────────────────────────────────────────────────────

log('Starting worker process...');

const { scraper, tailor, apply } = startAllWorkers();
startScheduler();
startHealthServer();

log('Workers started: scraper (concurrency 1), tailor (concurrency 2), apply (concurrency 1)');
log('Scheduler started: daily scrape at 08:00 IST');
log('Health server started: http://localhost:3001/health');
log('Waiting for jobs...');

// ── Event logging ─────────────────────────────────────────────────

scraper.on('completed', (job) => log(`[scraper] completed: ${job?.id}`));
scraper.on('failed', (job, err) => log(`[scraper] failed: ${job?.id} — ${err.message}`));

tailor.on('completed', (job) => log(`[tailor] completed: ${job?.id}`));
tailor.on('failed', (job, err) => log(`[tailor] failed: ${job?.id} — ${err.message}`));

apply.on('completed', (job) => log(`[apply] completed: ${job?.id}`));
apply.on('failed', (job, err) => log(`[apply] failed: ${job?.id} — ${err.message}`));

// ── Graceful shutdown ─────────────────────────────────────────────

async function shutdown(signal: string) {
  log(`Received ${signal} — shutting down gracefully...`);

  stopScheduler();
  stopHealthServer();

  // Close workers (waits for running jobs to finish)
  await Promise.allSettled([
    scraper.close(),
    tailor.close(),
    apply.close(),
  ]);
  log('Workers closed');

  // Close queues
  await Promise.allSettled([
    scraperQueue.close(),
    tailorQueue.close(),
    applyQueue.close(),
  ]);
  log('Queues closed');

  log('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
