/**
 * Lightweight health check server for the worker process.
 * Runs on port 3001 alongside the Next.js dev server on 3000.
 */

import { createServer, type Server } from 'http';
import { scraperQueue, tailorQueue, applyQueue } from '../lib/queue/queues';

const PORT = 3001;
let server: Server | null = null;

export function startHealthServer(): void {
  server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      try {
        const [scraperDepth, tailorDepth, applyDepth] = await Promise.all([
          scraperQueue.getWaitingCount(),
          tailorQueue.getWaitingCount(),
          applyQueue.getWaitingCount(),
        ]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            workers: ['scraper', 'tailor', 'apply'],
            queues: {
              scraper: scraperDepth,
              tailor: tailorDepth,
              apply: applyDepth,
            },
            timestamp: new Date().toISOString(),
          }),
        );
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: String(err) }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(PORT);
}

export function stopHealthServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
