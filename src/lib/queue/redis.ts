/**
 * Redis connection config for BullMQ.
 * BullMQ creates its own ioredis instances internally —
 * we just provide the connection options.
 */
export const redisConnection = {
  host: new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').hostname,
  port: Number(new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').port) || 6379,
  maxRetriesPerRequest: null as null, // required by BullMQ
  retryStrategy(times: number) {
    if (times > 3) {
      console.error('[redis] max retries exceeded — giving up');
      return null;
    }
    return Math.min(times * 500, 3000);
  },
};
