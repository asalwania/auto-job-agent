import { chromium, type Browser, type Page } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import type { Job } from '@/types';

// ── Types ─────────────────────────────────────────────────────────

export interface ApplyResult {
  success: boolean;
  error?: string;
  screenshot?: string;
}

// ── Constants ─────────────────────────────────────────────────────

const SCREENSHOT_DIR = join(process.cwd(), 'storage', 'screenshots');

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

// ── Abstract base class ───────────────────────────────────────────

export abstract class BaseApplier {
  readonly source: string;
  protected browser: Browser | null = null;
  protected page: Page | null = null;

  constructor(source: string) {
    this.source = source;
  }

  async init(): Promise<void> {
    const width = randomInt(1280, 1920);
    const height = randomInt(800, 1080);

    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await this.browser.newContext({
      userAgent: USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)],
      viewport: { width, height },
      locale: 'en-US',
    });

    this.page = await context.newPage();
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }

  abstract apply(
    job: Job,
    resumePath: string,
    coverLetter: string,
  ): Promise<ApplyResult>;

  protected async randomDelay(min = 1000, max = 3000): Promise<void> {
    const ms = randomInt(min, max);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Save a screenshot and return the file path. */
  protected async takeScreenshot(name: string): Promise<string> {
    if (!this.page) return '';
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    const filename = `${name}-${Date.now()}.png`;
    const path = join(SCREENSHOT_DIR, filename);
    await this.page.screenshot({ path, fullPage: false });
    return path;
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
