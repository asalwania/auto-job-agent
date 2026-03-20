/**
 * Manual integration test — tests the full pipeline with real services.
 *
 * Prerequisites:
 *   - Supabase running with schema applied
 *   - Redis running on REDIS_URL
 *   - OPENAI_API_KEY set
 *   - Base resume seeded (npm run seed)
 *
 * Usage:
 *   npx tsx src/tests/integration.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { stat, unlink } from 'fs/promises';
import { Queue } from 'bullmq';

// ── Helpers ───────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const total = 6;

function ok(name: string, detail?: string) {
  passed++;
  console.log(`\x1b[32m✅ ${name}\x1b[0m${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, err: unknown) {
  failed++;
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`\x1b[31m❌ ${name}\x1b[0m — ${msg}`);
}

function header(name: string) {
  console.log(`\n\x1b[36m── Test: ${name} ──\x1b[0m`);
}

// ── Sample data ───────────────────────────────────────────────────

const SAMPLE_JD = `We are looking for a Senior React Engineer with 5+ years experience in TypeScript, Node.js, and REST APIs. Experience with LLMs and RAG pipelines is a plus. You'll work on our AI-powered platform, building scalable frontends and integrating with microservices. Strong understanding of CI/CD, testing, and agile methodologies required.`;

// ── Test 1: Database ──────────────────────────────────────────────

async function testDatabase() {
  header('Database Connection');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE env vars');

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Insert test job
  const { data: inserted, error: insertErr } = await supabase
    .from('jobs')
    .insert({
      title: '__integration_test__',
      company: 'TestCo',
      url: `https://test.example.com/${Date.now()}`,
      source: 'lever',
      status: 'pending',
    })
    .select()
    .single();

  if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

  // Fetch it back
  const { data: fetched, error: fetchErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', inserted.id)
    .single();

  if (fetchErr) throw new Error(`Fetch failed: ${fetchErr.message}`);
  if (fetched.title !== '__integration_test__') throw new Error('Data mismatch');

  // Delete it
  const { error: deleteErr } = await supabase
    .from('jobs')
    .delete()
    .eq('id', inserted.id);

  if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`);

  ok('Database OK', `Inserted, fetched, and deleted job ${inserted.id}`);
}

// ── Test 2: OpenAI API (JD Parser) ───────────────────────────────

async function testOpenAiApi() {
  header('OpenAI API (JD Parser)');

  const { parseJobDescription } = await import('../lib/ai/jd-parser');
  const analysis = await parseJobDescription(SAMPLE_JD);

  if (!analysis.requiredSkills.length && !analysis.keywords.length) {
    throw new Error('JDAnalysis returned empty — API may have failed');
  }

  console.log('  Required Skills:', analysis.requiredSkills.slice(0, 5).join(', '));
  console.log('  Keywords:', analysis.keywords.slice(0, 8).join(', '));
  console.log('  Role Level:', analysis.roleLevel);
  console.log('  Experience Years:', analysis.experienceYears);

  ok('OpenAI API OK', `${analysis.requiredSkills.length} skills, ${analysis.keywords.length} keywords`);

  return analysis;
}

// ── Test 3: Resume Tailor ─────────────────────────────────────────

async function testResumeTailor(jdAnalysis: Awaited<ReturnType<typeof testOpenAiApi>>) {
  header('Resume Tailor');

  const { createClient: createSB } = await import('@supabase/supabase-js');
  const supabase = createSB(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Load base resume
  const { data: resumeRow, error } = await supabase
    .from('base_resumes')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !resumeRow) throw new Error('No active base resume — run "npm run seed" first');

  const baseResume = resumeRow.data;

  const { tailorResume } = await import('../lib/ai/resume-tailor');
  const tailored = await tailorResume(baseResume, jdAnalysis, SAMPLE_JD);

  const bulletCount = Object.values(tailored.tailoredBullets).flat().length;
  const firstBullet = Object.values(tailored.tailoredBullets).flat()[0] ?? '(none)';

  console.log('  ATS Score:', tailored.atsScore);
  console.log('  Covered Keywords:', tailored.coveredKeywords.length);
  console.log('  Missing Keywords:', tailored.missingKeywords.length);
  console.log('  First Bullet:', firstBullet.slice(0, 80) + (firstBullet.length > 80 ? '...' : ''));

  ok('Resume Tailor OK', `Score ${tailored.atsScore}, ${bulletCount} bullets`);

  return { baseResume, tailored };
}

// ── Test 4: PDF Generation ────────────────────────────────────────

async function testPdfGeneration(
  baseResume: Record<string, unknown>,
  tailored: Record<string, unknown>,
) {
  header('PDF Generation');

  const { generateResumePdf } = await import('../lib/resume/pdf-builder');
  const outputPath = './storage/test-resume.pdf';

  await generateResumePdf(baseResume as never, tailored as never, outputPath);

  const info = await stat(outputPath);

  if (info.size < 10_000) {
    throw new Error(`PDF too small: ${info.size} bytes (expected >10KB)`);
  }

  console.log('  File:', outputPath);
  console.log('  Size:', `${(info.size / 1024).toFixed(1)} KB`);

  ok('PDF Generation OK', `${(info.size / 1024).toFixed(1)} KB`);

  // Clean up
  await unlink(outputPath).catch(() => {});
}

// ── Test 5: Queue ─────────────────────────────────────────────────

async function testQueue() {
  header('Queue (BullMQ)');

  const { redisConnection } = await import('../lib/queue/redis');

  const testQueue = new Queue('integration-test', { connection: redisConnection });

  // Add a test job
  const job = await testQueue.add('test-job', { ts: Date.now() });
  console.log('  Job added:', job.id);

  // Check it exists
  const waiting = await testQueue.getWaitingCount();
  console.log('  Waiting jobs:', waiting);

  // Clean up
  await testQueue.obliterate({ force: true });
  await testQueue.close();

  ok('Queue OK', `Job ${job.id} queued successfully`);
}

// ── Test 6: Scraper Smoke Test ────────────────────────────────────

async function testScraper() {
  header('Scraper Smoke Test (LinkedIn)');

  const { LinkedInScraper } = await import('../lib/scrapers/linkedin');
  const scraper = new LinkedInScraper();

  try {
    await scraper.init();

    // Override to get just 1 result — access the page directly
    const page = (scraper as unknown as Record<string, unknown>)['page'] as import('playwright').Page;
    if (!page) throw new Error('Browser page not initialized');

    const searchUrl =
      'https://www.linkedin.com/jobs/search/?keywords=senior+react+engineer&location=India&f_WT=2';

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    // Wait briefly for content
    await page.waitForTimeout(3000);

    // Check if we're blocked
    const url = page.url();
    if (url.includes('/login') || url.includes('/checkpoint')) {
      console.log('  LinkedIn requires login — skipping detailed scrape');
      console.log('  Page URL:', url);
      ok('Scraper OK', 'Browser launched, LinkedIn login wall detected (expected without auth)');
      return;
    }

    // Try to grab first card
    const firstCard = await page.$eval(
      '.base-search-card',
      (el) => ({
        title: el.querySelector('.base-search-card__title')?.textContent?.trim() ?? '',
        company: el.querySelector('.base-search-card__subtitle')?.textContent?.trim() ?? '',
      }),
    ).catch(() => null);

    if (firstCard && firstCard.title) {
      console.log('  First result:', firstCard.title);
      console.log('  Company:', firstCard.company);
      ok('Scraper OK', `Found: ${firstCard.title} at ${firstCard.company}`);
    } else {
      console.log('  No cards found (page may be empty or anti-bot)');
      ok('Scraper OK', 'Browser launched and navigated (no results on page)');
    }
  } finally {
    await scraper.close();
  }
}

// ── Runner ────────────────────────────────────────────────────────

async function main() {
  console.log('\x1b[1m\n🧪 Job Agent — Integration Tests\x1b[0m');
  console.log('═'.repeat(50));

  // Test 1
  try {
    await testDatabase();
  } catch (err) {
    fail('Database', err);
  }

  // Test 2
  let jdAnalysis: Awaited<ReturnType<typeof testOpenAiApi>> | null = null;
  try {
    jdAnalysis = await testOpenAiApi();
  } catch (err) {
    fail('OpenAI API', err);
  }

  // Test 3
  let resumeData: Awaited<ReturnType<typeof testResumeTailor>> | null = null;
  try {
    if (!jdAnalysis) throw new Error('Skipped — OpenAI API test failed');
    resumeData = await testResumeTailor(jdAnalysis);
  } catch (err) {
    fail('Resume Tailor', err);
  }

  // Test 4
  try {
    if (!resumeData) throw new Error('Skipped — Resume Tailor test failed');
    await testPdfGeneration(
      resumeData.baseResume as unknown as Record<string, unknown>,
      resumeData.tailored as unknown as Record<string, unknown>,
    );
  } catch (err) {
    fail('PDF Generation', err);
  }

  // Test 5
  try {
    await testQueue();
  } catch (err) {
    fail('Queue', err);
  }

  // Test 6
  try {
    await testScraper();
  } catch (err) {
    fail('Scraper', err);
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(
    `\x1b[1m${passed}/${total} tests passed\x1b[0m` +
      (failed > 0 ? ` \x1b[31m(${failed} failed)\x1b[0m` : ' \x1b[32m(all passed)\x1b[0m'),
  );
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

main();
