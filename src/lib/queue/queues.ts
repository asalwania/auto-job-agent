import { Queue } from 'bullmq';
import { redisConnection } from './redis';

// ── Queue names ───────────────────────────────────────────────────

export const SCRAPER_QUEUE = 'scraper';
export const TAILOR_QUEUE = 'tailor';
export const APPLY_QUEUE = 'apply';

// ── Default job options ───────────────────────────────────────────

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

// ── Queues ────────────────────────────────────────────────────────

export const scraperQueue = new Queue(SCRAPER_QUEUE, {
  connection: redisConnection,
  defaultJobOptions,
});

export const tailorQueue = new Queue(TAILOR_QUEUE, {
  connection: redisConnection,
  defaultJobOptions,
});

export const applyQueue = new Queue(APPLY_QUEUE, {
  connection: redisConnection,
  defaultJobOptions,
});
